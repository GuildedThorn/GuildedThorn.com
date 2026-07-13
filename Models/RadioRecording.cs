using System;

namespace GuildedThorn.com.Models;

// A recorded radio broadcast. The file itself lives on disk (Radio:RecordingsDirectory,
// see RadioSourceListener); this document is just the metadata used to list and
// serve it (same disk-file + Mongo-record split GalleryImage uses).
public class RadioRecording {

    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string FileName { get; set; } = string.Empty;
    public string StationName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime EndedAt { get; set; }
    public long DurationSeconds { get; set; }
    public long SizeBytes { get; set; }
}
