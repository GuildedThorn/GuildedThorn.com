using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using MongoDB.Bson;
using MongoDB.Driver;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("api/[controller]")]
public class KnowledgeBaseController(MongoDbService mongoDbService, KnowledgeBaseSyncEngine syncEngine) : ControllerBase {

    private static readonly FileExtensionContentTypeProvider ContentTypes = new();

    /// <summary>Paginated, searchable list of published notes.</summary>
    [AllowAnonymous]
    [HttpGet("notes")]
    public async Task<IActionResult> GetNotes(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        [FromQuery] string? search = null,
        [FromQuery] string? tags = null,
        [FromQuery] string? folder = null) {
        if (page < 1 || pageSize < 1) return BadRequest("Invalid pagination values");

        var coll = mongoDbService.GetKnowledgeBaseNoteCollection();

        var builder = Builders<KnowledgeBaseNote>.Filter;
        var filter = builder.Empty;
        if (!string.IsNullOrWhiteSpace(search)) {
            var regex = new BsonRegularExpression(Regex.Escape(search.Trim()), "i");
            filter &= builder.Or(
                builder.Regex(n => n.Title, regex),
                builder.Regex(n => n.Content, regex));
        }

        var include = SplitCsv(tags);
        if (include.Count > 0) filter &= builder.AnyIn(n => n.Tags, include);

        if (!string.IsNullOrWhiteSpace(folder)) filter &= builder.Eq(n => n.Folder, folder);

        var totalDocs = await coll.CountDocumentsAsync(filter);
        var totalPages = (int)Math.Ceiling(totalDocs / (double)pageSize);

        var items = await coll.Find(filter)
            .SortByDescending(n => n.LastChangedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .Project(n => new {
                n.Slug, n.Title, n.Folder, n.Tags, n.Content, n.LastChangedAt,
            })
            .ToListAsync();

        return Ok(new { items, totalPages, total = totalDocs });
    }

    /// <summary>Single note, rendered, with resolved backlinks/outgoing-link titles.</summary>
    [AllowAnonymous]
    [HttpGet("notes/{slug}")]
    public async Task<IActionResult> GetNote(string slug) {
        var coll = mongoDbService.GetKnowledgeBaseNoteCollection();
        var note = await coll.Find(n => n.Slug == slug).FirstOrDefaultAsync();
        if (note is null) return NotFound(new { message = "Note not found" });

        var linkedSlugs = note.OutgoingLinks.Concat(note.Backlinks).Distinct().ToList();
        var titleBySlug = await coll.Find(Builders<KnowledgeBaseNote>.Filter.In(n => n.Slug, linkedSlugs))
            .Project(n => new { n.Slug, n.Title })
            .ToListAsync();
        var titles = titleBySlug.ToDictionary(t => t.Slug, t => t.Title);

        return Ok(new {
            note.Slug, note.Title, note.Folder, note.FilePath, note.Content, note.Html,
            note.Tags, note.LastChangedAt, note.FirstSyncedAt,
            outgoingLinks = note.OutgoingLinks.Select(s => new { slug = s, title = titles.GetValueOrDefault(s, s) }),
            backlinks = note.Backlinks.Select(s => new { slug = s, title = titles.GetValueOrDefault(s, s) }),
        });
    }

    /// <summary>Distinct tags across every published note, for the filter UI.</summary>
    [AllowAnonymous]
    [HttpGet("tags")]
    public async Task<IActionResult> GetTags() {
        var tagLists = await mongoDbService.GetKnowledgeBaseNoteCollection()
            .Find(Builders<KnowledgeBaseNote>.Filter.Empty)
            .Project(n => n.Tags)
            .ToListAsync();

        var tags = tagLists
            .Where(t => t != null)
            .SelectMany(t => t)
            .Select(t => t.Trim())
            .Where(t => t.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(t => t, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return Ok(tags);
    }

    /// <summary>Distinct top-level vault folders in use, for the folder filter.</summary>
    [AllowAnonymous]
    [HttpGet("folders")]
    public async Task<IActionResult> GetFolders() {
        var folders = await mongoDbService.GetKnowledgeBaseNoteCollection()
            .Distinct(n => n.Folder, Builders<KnowledgeBaseNote>.Filter.Empty)
            .ToListAsync();

        return Ok(folders.Where(f => !string.IsNullOrWhiteSpace(f)).OrderBy(f => f, StringComparer.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Every published note grouped by its top-level vault folder, for the
    /// sidebar's hierarchy navigation. Folder names carry the vault's own
    /// numeric prefixes (e.g. "01 Maps"), so an ordinal sort of the folder
    /// name already reproduces the vault's intended ordering.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("tree")]
    public async Task<IActionResult> GetTree() {
        var notes = await mongoDbService.GetKnowledgeBaseNoteCollection()
            .Find(Builders<KnowledgeBaseNote>.Filter.Empty)
            .Project(n => new { n.Slug, n.Title, n.Folder })
            .ToListAsync();

        var tree = notes
            .GroupBy(n => n.Folder)
            .OrderBy(g => g.Key, StringComparer.OrdinalIgnoreCase)
            .Select(g => new {
                folder = g.Key,
                notes = g.OrderBy(n => n.Title, StringComparer.OrdinalIgnoreCase)
                    .Select(n => new { slug = n.Slug, title = n.Title }),
            });

        return Ok(tree);
    }

    /// <summary>Nodes + edges across every published note, for the knowledge graph widget.</summary>
    [AllowAnonymous]
    [HttpGet("graph")]
    public async Task<IActionResult> GetGraph() {
        var notes = await mongoDbService.GetKnowledgeBaseNoteCollection()
            .Find(Builders<KnowledgeBaseNote>.Filter.Empty)
            .Project(n => new { n.Slug, n.Title, n.Folder, n.OutgoingLinks })
            .ToListAsync();

        var nodes = notes.Select(n => new { id = n.Slug, title = n.Title, folder = n.Folder });
        var edges = notes
            .SelectMany(n => n.OutgoingLinks.Select(target => new { source = n.Slug, target }))
            // A dangling wikilink never resolves to a stored slug, so drop any
            // edge pointing at a note that isn't (or is no longer) published.
            .Where(e => notes.Any(n => n.Slug == e.target));

        return Ok(new { nodes, edges });
    }

    // Vault images live flat under "91 Images" in this vault's convention, but
    // the route accepts a sub-path in case that changes — ResolveImagePath
    // guards against escaping the images root either way.
    [AllowAnonymous]
    [HttpGet("images/{**path}")]
    public IActionResult GetImage(string path) {
        var resolved = syncEngine.ResolveImagePath(path);
        if (resolved is null) return NotFound();

        if (!ContentTypes.TryGetContentType(resolved, out var contentType))
            contentType = "application/octet-stream";

        return PhysicalFile(resolved, contentType, enableRangeProcessing: true);
    }

    /// <summary>
    /// Owner-triggered immediate re-sync. Always force-reparses (unlike the
    /// scheduled poller, which skips when the vault's commit hasn't moved) —
    /// this is also how a local parsing/ignore-rule change (not just a vault
    /// content change) gets applied without waiting for a new upstream commit.
    /// </summary>
    [Authorize(Roles = "owner")]
    [HttpPost("sync")]
    public async Task<IActionResult> Sync() {
        var count = await syncEngine.SyncAsync(force: true, HttpContext.RequestAborted);
        return Ok(new { message = "Sync complete", notes = count });
    }

    private static List<string> SplitCsv(string? csv)
        => string.IsNullOrWhiteSpace(csv)
            ? new List<string>()
            : csv.Split(',').Select(t => t.Trim()).Where(t => t.Length > 0).ToList();
}
