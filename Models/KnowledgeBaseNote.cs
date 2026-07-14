using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace GuildedThorn.com.Models;

// One published note from the GuildedThorn/knowledge-base Obsidian vault.
// Notes flagged `private: true` in frontmatter never become one of these —
// KnowledgeBaseSyncEngine skips them before a doc is ever created.
public class KnowledgeBaseNote {

        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        // URL-safe identifier derived from the vault-relative path, e.g.
        // "07-projects-guildedthorncom-overview". Unique across the vault.
        public string Slug { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        // Top-level vault folder, e.g. "07 Projects".
        public string Folder { get; set; } = string.Empty;

        // Vault-relative path, e.g. "07 Projects/GuildedThorn.com/GuildedThorn.com - Overview.md".
        // Unique — used as the upsert key during sync.
        public string FilePath { get; set; } = string.Empty;

        // Frontmatter-stripped, wikilink-resolved Markdown source.
        public string Content { get; set; } = string.Empty;

        // Rendered HTML (Markdig, same pipeline as the blog).
        public string Html { get; set; } = string.Empty;

        public List<string> Tags { get; set; } = new();

        // Slugs of notes this note links to.
        public List<string> OutgoingLinks { get; set; } = new();

        // Slugs of notes that link to this note — recomputed after every full sync pass.
        public List<string> Backlinks { get; set; } = new();

        // SHA256 of the raw file bytes, used to detect real content changes
        // (vs. a no-op git reset) without re-diffing markdown.
        public string ContentHash { get; set; } = string.Empty;

        public DateTime FirstSyncedAt { get; set; } = DateTime.UtcNow;

        // Real commit date of the file's last change, from the vault's git history.
        public DateTime LastChangedAt { get; set; } = DateTime.UtcNow;
}
