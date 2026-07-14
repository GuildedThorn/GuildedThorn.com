using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using LibGit2Sharp;
using Markdig;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace GuildedThorn.com.Services;

// Mirrors the public GuildedThorn/knowledge-base Obsidian vault into Mongo as
// browsable notes. Owns both the git mirror (LibGit2Sharp — no external git
// binary needed) and the Obsidian-flavoured Markdown parsing (frontmatter,
// [[wikilinks]], ![[image embeds]]). Called by KnowledgeBaseSyncService on a
// timer and by KnowledgeBaseController's owner-only manual sync endpoint —
// both share this one code path so there's exactly one place that decides
// what's public.
public class KnowledgeBaseSyncEngine {

    private readonly MongoDbService _mongo;
    private readonly IConfiguration _config;
    private readonly IHostEnvironment _env;
    private readonly ILogger<KnowledgeBaseSyncEngine> _logger;

    // Only one sync (scheduled or manual) may run at a time.
    private readonly SemaphoreSlim _gate = new(1, 1);

    public KnowledgeBaseSyncEngine(
        MongoDbService mongo, IConfiguration config, IHostEnvironment env, ILogger<KnowledgeBaseSyncEngine> logger) {
        _mongo = mongo;
        _config = config;
        _env = env;
        _logger = logger;
    }

    private string RepoUrl => _config["KnowledgeBase:RepoUrl"] ?? "https://github.com/GuildedThorn/knowledge-base.git";
    private string Branch => _config["KnowledgeBase:Branch"] ?? "main";

    private string RepoPath {
        get {
            var configured = _config["KnowledgeBase:RepoPath"] ?? "data/kb-repo";
            return Path.IsPathRooted(configured) ? configured : Path.Combine(_env.ContentRootPath, configured);
        }
    }

    // This vault's convention for pasted/embedded images (see AGENT.md folder rules).
    public string ImagesRoot => Path.Combine(RepoPath, "91 Images");

    /// <summary>
    /// Resolves a requested image file name to a path under <see cref="ImagesRoot"/>,
    /// or null if it would escape that directory (path-traversal guard) or doesn't exist.
    /// </summary>
    public string? ResolveImagePath(string fileName) {
        var candidate = Path.GetFullPath(Path.Combine(ImagesRoot, fileName));
        var root = Path.GetFullPath(ImagesRoot) + Path.DirectorySeparatorChar;
        if (!candidate.StartsWith(root, StringComparison.Ordinal)) return null;
        return File.Exists(candidate) ? candidate : null;
    }

    private static readonly Regex FrontmatterRegex = new(
        @"^﻿?---\s*\r?\n(.*?)\r?\n---\s*\r?\n?", RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly Regex WikilinkRegex = new(
        @"!?\[\[([^\]|#]+)(#[^\]|]+)?(\|([^\]]+))?\]\]", RegexOptions.Compiled);

    private static readonly Regex ImageExtension = new(
        @"\.(png|jpe?g|gif|svg|webp)$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex NonSlugChars = new(@"[^a-z0-9]+", RegexOptions.Compiled);

    // Vault scaffolding, not knowledge-base content — never published regardless
    // of frontmatter.
    private static readonly HashSet<string> IgnoredFileNames = new(StringComparer.OrdinalIgnoreCase) {
        "AGENT.md",
        "README.md",
    };

    /// <summary>
    /// Fetches the vault, and — only if the remote HEAD moved (or <paramref name="force"/>
    /// is set) — re-parses every note and re-syncs Mongo. Returns the number of
    /// published notes after the sync (0 if nothing changed and nothing is published).
    /// </summary>
    public async Task<int> SyncAsync(bool force = false, CancellationToken ct = default) {
        await _gate.WaitAsync(ct);
        try {
            return await SyncCoreAsync(force, ct);
        } finally {
            _gate.Release();
        }
    }

    private async Task<int> SyncCoreAsync(bool force, CancellationToken ct) {
        EnsureCloned();

        using var repo = new Repository(RepoPath);
        var remote = repo.Network.Remotes["origin"];
        var refSpecs = remote.FetchRefSpecs.Select(r => r.Specification);
        Commands.Fetch(repo, remote.Name, refSpecs, new FetchOptions(), "knowledge-base sync");

        var remoteBranch = repo.Branches[$"origin/{Branch}"];
        if (remoteBranch is null) {
            _logger.LogWarning("KnowledgeBase: remote branch origin/{Branch} not found", Branch);
            return 0;
        }
        var remoteTipSha = remoteBranch.Tip.Sha;

        var stateColl = _mongo.GetKnowledgeBaseSyncStateCollection();
        var state = await stateColl.Find(Builders<KnowledgeBaseSyncState>.Filter.Empty).FirstOrDefaultAsync(ct);
        // The SHA check only guards the *scheduled* poll from wastefully re-parsing
        // an unchanged vault — a forced (manual) sync always re-parses, since its
        // whole purpose is to pick up local changes (e.g. to the parsing/ignore
        // rules themselves) that a git commit SHA can't reflect.
        if (!force && state is not null && state.LastSyncedCommitSha == remoteTipSha) {
            return (int)await _mongo.GetKnowledgeBaseNoteCollection().CountDocumentsAsync(FilterDefinition<KnowledgeBaseNote>.Empty, cancellationToken: ct);
        }

        repo.Reset(ResetMode.Hard, remoteBranch.Tip);

        var count = await ParseAndUpsertAllAsync(repo, ct);

        if (state is null) {
            await stateColl.InsertOneAsync(new KnowledgeBaseSyncState { LastSyncedCommitSha = remoteTipSha }, cancellationToken: ct);
        } else {
            await stateColl.UpdateOneAsync(
                s => s.Id == state.Id,
                Builders<KnowledgeBaseSyncState>.Update.Set(s => s.LastSyncedCommitSha, remoteTipSha),
                cancellationToken: ct);
        }

        _logger.LogInformation("KnowledgeBase: synced {Count} notes at {Sha}", count, remoteTipSha[..7]);
        return count;
    }

    private void EnsureCloned() {
        if (Repository.IsValid(RepoPath)) return;

        Directory.CreateDirectory(RepoPath);
        _logger.LogInformation("KnowledgeBase: cloning {RepoUrl} into {RepoPath}", RepoUrl, RepoPath);
        Repository.Clone(RepoUrl, RepoPath, new CloneOptions { BranchName = Branch });
    }

    private async Task<int> ParseAndUpsertAllAsync(Repository repo, CancellationToken ct) {
        var gitDir = Path.Combine(RepoPath, ".git");
        var files = Directory.EnumerateFiles(RepoPath, "*.md", SearchOption.AllDirectories)
            .Where(f => !f.StartsWith(gitDir, StringComparison.Ordinal))
            .Where(f => !IgnoredFileNames.Contains(Path.GetFileName(f)))
            .ToList();

        // Pass 1 — build filename/path -> slug lookup tables for wikilink resolution.
        var byBasename = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
        var byFullPath = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var relPathByFile = new Dictionary<string, string>();

        foreach (var file in files) {
            var rel = Path.GetRelativePath(RepoPath, file).Replace('\\', '/');
            relPathByFile[file] = rel;
            var noExt = rel[..^3]; // strip ".md"
            var slug = Slugify(noExt);
            byFullPath[noExt] = slug;

            var basename = Path.GetFileNameWithoutExtension(file);
            if (!byBasename.TryGetValue(basename, out var list)) {
                list = new List<string>();
                byBasename[basename] = list;
            }
            list.Add(slug);
        }

        var coll = _mongo.GetKnowledgeBaseNoteCollection();
        var existing = await coll.Find(Builders<KnowledgeBaseNote>.Filter.Empty)
            .Project(n => new { n.Id, n.Slug, n.FirstSyncedAt, n.ContentHash, n.LastChangedAt })
            .ToListAsync(ct);
        var existingBySlug = existing.ToDictionary(n => n.Slug);

        var pipeline = new MarkdownPipelineBuilder().UseAdvancedExtensions().Build();
        var seenSlugs = new HashSet<string>();
        var notes = new List<KnowledgeBaseNote>();

        foreach (var file in files) {
            ct.ThrowIfCancellationRequested();

            var rel = relPathByFile[file];
            var noExt = rel[..^3];
            var slug = Slugify(noExt);
            var slashIndex = rel.IndexOf('/');
            var folder = slashIndex > 0 ? rel[..slashIndex] : "";

            var raw = await File.ReadAllTextAsync(file, ct);
            var hash = ComputeHash(raw);

            var (isPrivate, title, tags) = ParseFrontmatter(raw);
            // The safety boundary: a private note is never upserted, never
            // rendered, never touches the public collection at all.
            if (isPrivate) continue;

            seenSlugs.Add(slug);

            var body = StripFrontmatter(raw);
            var (resolvedBody, outgoing) = ResolveWikilinks(body, byFullPath, byBasename);
            var html = Markdown.ToHtml(resolvedBody, pipeline);
            var displayTitle = !string.IsNullOrWhiteSpace(title) ? title! : Path.GetFileNameWithoutExtension(file);

            existingBySlug.TryGetValue(slug, out var prior);
            var unchanged = prior is not null && prior.ContentHash == hash;

            notes.Add(new KnowledgeBaseNote {
                // ReplaceOneAsync (unlike InsertOneAsync) never auto-generates
                // the ObjectId, and MongoDB rejects a replace whose _id doesn't
                // match the existing document's — so reuse it when updating,
                // and mint a fresh one only for genuinely new notes.
                Id = prior?.Id ?? MongoDB.Bson.ObjectId.GenerateNewId().ToString(),
                Slug = slug,
                Title = displayTitle,
                Folder = folder,
                FilePath = rel,
                Content = resolvedBody,
                Html = html,
                Tags = tags,
                OutgoingLinks = outgoing.Distinct().ToList(),
                ContentHash = hash,
                FirstSyncedAt = prior?.FirstSyncedAt ?? DateTime.UtcNow,
                LastChangedAt = unchanged ? prior!.LastChangedAt : GetLastCommitDate(repo, rel),
            });
        }

        // Backlinks depend on the full set, so compute after every note is parsed.
        var backlinkMap = notes.ToDictionary(n => n.Slug, _ => new List<string>());
        foreach (var note in notes) {
            foreach (var target in note.OutgoingLinks) {
                if (backlinkMap.TryGetValue(target, out var list)) list.Add(note.Slug);
            }
        }
        foreach (var note in notes) note.Backlinks = backlinkMap[note.Slug];

        foreach (var note in notes) {
            await coll.ReplaceOneAsync(
                n => n.FilePath == note.FilePath,
                note,
                new ReplaceOptions { IsUpsert = true },
                ct);
        }

        // Anything no longer on disk (deleted/renamed) or that just became
        // private is removed from the public collection outright.
        var stale = existingBySlug.Keys.Where(s => !seenSlugs.Contains(s)).ToList();
        if (stale.Count > 0) {
            await coll.DeleteManyAsync(Builders<KnowledgeBaseNote>.Filter.In(n => n.Slug, stale), ct);
        }

        return notes.Count;
    }

    private static DateTime GetLastCommitDate(Repository repo, string relPath) {
        try {
            var entry = repo.Commits.QueryBy(relPath).FirstOrDefault();
            return entry is not null ? entry.Commit.Author.When.UtcDateTime : DateTime.UtcNow;
        } catch {
            return DateTime.UtcNow;
        }
    }

    private static (bool isPrivate, string? title, List<string> tags) ParseFrontmatter(string content) {
        var tags = new List<string>();
        var block = FrontmatterRegex.Match(content);
        if (!block.Success) return (false, null, tags);

        var body = block.Groups[1].Value;

        var privateMatch = Regex.Match(body, @"^private\s*:\s*(true|false)\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
        var isPrivate = privateMatch.Success && string.Equals(privateMatch.Groups[1].Value, "true", StringComparison.OrdinalIgnoreCase);

        var titleMatch = Regex.Match(body, @"^title\s*:\s*(.+)$", RegexOptions.Multiline);
        string? title = titleMatch.Success ? titleMatch.Groups[1].Value.Trim().Trim('"', '\'') : null;

        var tagsMatch = Regex.Match(body, @"^tags\s*:\s*(.+)$", RegexOptions.Multiline);
        if (tagsMatch.Success) {
            var value = tagsMatch.Groups[1].Value.Trim().Trim('[', ']');
            foreach (var raw in value.Split(',')) {
                var tag = raw.Trim().Trim('"', '\'');
                if (tag.Length > 0 && !tags.Contains(tag, StringComparer.OrdinalIgnoreCase))
                    tags.Add(tag);
            }
        }

        return (isPrivate, title, tags);
    }

    private static string StripFrontmatter(string content) => FrontmatterRegex.Replace(content, "");

    /// <summary>
    /// Rewrites Obsidian `[[wikilinks]]` to site-relative `/kb/{slug}` Markdown
    /// links and `![[image.png]]` embeds to the image-proxy endpoint. Dangling
    /// links (target not found in the vault) render as plain text rather than
    /// a broken link.
    /// </summary>
    private static (string body, List<string> outgoingSlugs) ResolveWikilinks(
        string body, Dictionary<string, string> byFullPath, Dictionary<string, List<string>> byBasename) {

        var outgoing = new List<string>();

        string? Resolve(string target) {
            if (byFullPath.TryGetValue(target, out var exact)) return exact;
            var baseName = target.Contains('/') ? target[(target.LastIndexOf('/') + 1)..] : target;
            return byBasename.TryGetValue(baseName, out var candidates) && candidates.Count > 0
                ? candidates[0]
                : null;
        }

        string ReplaceMatch(Match m) {
            var isEmbed = m.Value.StartsWith('!');
            var target = m.Groups[1].Value.Trim();
            var alias = m.Groups[4].Success ? m.Groups[4].Value.Trim() : target;

            if (isEmbed && ImageExtension.IsMatch(target)) {
                var fileName = target.Contains('/') ? target[(target.LastIndexOf('/') + 1)..] : target;
                return $"![{fileName}](/api/knowledgebase/images/{Uri.EscapeDataString(fileName)})";
            }

            var slug = Resolve(target);
            if (slug is null) return alias;

            outgoing.Add(slug);
            return $"[{alias}](/kb/{slug})";
        }

        var resolved = WikilinkRegex.Replace(body, ReplaceMatch);
        return (resolved, outgoing);
    }

    private static string Slugify(string input) {
        var slug = NonSlugChars.Replace(input.ToLowerInvariant(), "-").Trim('-');
        return slug.Length > 0 ? slug : "note";
    }

    private static string ComputeHash(string content) {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(content));
        return Convert.ToHexString(hash);
    }
}
