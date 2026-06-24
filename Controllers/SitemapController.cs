using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace GuildedThorn.com.Controllers;

// Generates /sitemap.xml on the fly so it always reflects the current set of blog
// posts and gallery images (the old hand-maintained static file drifted). The
// static public/sitemap.xml was removed so this controller handles the route.
[ApiController]
public class SitemapController(MongoDbService mongo) : ControllerBase {

    // Public, indexable pages only — no auth/gated routes (/login, /settings,
    // /donate, /u/:username, etc.).
    private static readonly (string Path, string Priority)[] StaticPages = {
        ("/", "1.0"),
        ("/projects", "0.9"),
        ("/resume", "0.9"),
        ("/colophon", "0.8"),
        ("/blog/pages", "0.8"),
        ("/contact", "0.8"),
        ("/gallery/images", "0.7"),
        ("/tools", "0.7"),
        ("/stream", "0.6"),
        ("/radio", "0.6"),
        ("/net", "0.6"),
        ("/guestbook", "0.5"),
        ("/uses", "0.5"),
        ("/privacy", "0.3"),
        ("/cookies", "0.3"),
    };

    [AllowAnonymous]
    [HttpGet("/sitemap.xml")]
    public async Task<IActionResult> Get() {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";

        var posts = await mongo.GetBlogPostCollection()
            .Find(FilterDefinition<BlogPost>.Empty)
            .SortByDescending(p => p.CreatedAt)
            .ToListAsync();

        var images = await mongo.GetGalleryImageCollection()
            .Find(FilterDefinition<GalleryImage>.Empty)
            .SortByDescending(g => g.CreatedAt)
            .ToListAsync();

        using var ms = new MemoryStream();
        var settings = new XmlWriterSettings { Indent = true, Encoding = new UTF8Encoding(false), Async = true };
        await using (var w = XmlWriter.Create(ms, settings)) {
            await w.WriteStartDocumentAsync();
            w.WriteStartElement("urlset", "http://www.sitemaps.org/schemas/sitemap/0.9");

            foreach (var (path, priority) in StaticPages)
                WriteUrl(w, $"{baseUrl}{path}", null, priority);

            foreach (var post in posts)
                WriteUrl(w, $"{baseUrl}/blog/pages/{post.Id}",
                    (post.UpdatedAt == default ? post.CreatedAt : post.UpdatedAt), "0.6");

            foreach (var img in images)
                WriteUrl(w, $"{baseUrl}/gallery/images/{img.Id}", img.CreatedAt, "0.4");

            await w.WriteEndElementAsync();
            await w.WriteEndDocumentAsync();
        }

        return File(ms.ToArray(), "application/xml; charset=utf-8");
    }

    private static void WriteUrl(XmlWriter w, string loc, DateTime? lastmod, string priority) {
        w.WriteStartElement("url");
        w.WriteElementString("loc", loc);
        if (lastmod is { } d)
            w.WriteElementString("lastmod", d.ToUniversalTime().ToString("yyyy-MM-dd"));
        w.WriteElementString("priority", priority);
        w.WriteEndElement();
    }
}
