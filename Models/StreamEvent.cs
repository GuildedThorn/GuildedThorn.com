using System;

namespace GuildedThorn.com.Models;

// A scheduled radio stream. Stored split into Date (YYYY-MM-DD) and Time (HH:MM)
// to match the calendar UI in RadioSchedule.tsx. Only owners can create these.
public class StreamEvent {

    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Date { get; set; } = string.Empty; // YYYY-MM-DD
    public string Time { get; set; } = string.Empty; // HH:MM
    public string Title { get; set; } = string.Empty;
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
