using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Text;
using System.Threading.Channels;
using Microsoft.Extensions.Logging;

namespace GuildedThorn.com.Services;

// In-process broadcast hub that replaces an external Icecast server.
// A single source (Mixxx, via RadioSourceListener) pushes audio in with
// Publish(); every connected listener (RadioController.Stream) gets a copy.
public class RadioService {
    private readonly ILogger<RadioService> _logger;
    public RadioService(ILogger<RadioService> logger) => _logger = logger;

    private readonly ConcurrentDictionary<Guid, Channel<byte[]>> _listeners = new();
    private readonly object _sourceLock = new();

    // Ogg codecs (Opus/Vorbis/FLAC) send decoder-init header pages once at the
    // start of the stream. A listener joins mid-stream and would miss them, so
    // we capture those pages and replay them to every new listener. MP3/ADTS
    // are self-syncing and skip all of this (_headerBytes stays empty).
    private readonly object _hdrLock = new();
    private byte[] _headerBytes = Array.Empty<byte>();
    private List<byte>? _captureBuf;
    private bool _capturing;

    // When the source's declared content type is ambiguous (audio/mpeg or
    // unknown), detect MP3 vs ADTS-AAC from the first frame and fix ContentType.
    private bool _sniffCodec;

    // In-band "now playing" for Ogg sources. Unlike MP3/AAC (which push metadata
    // out-of-band via /admin/metadata), Ogg/Opus carries TITLE/ARTIST in an
    // OpusTags/VorbisComment header the source re-sends on every track change.
    private readonly object _metaLock = new();
    private readonly List<byte> _metaScan = new();
    private bool _scanOggMeta;
    private bool _oggTagsSeen;          // diagnostic: did we ever find an in-band comment header?
    private string _lastMetaLog = "\0"; // dedupe metadata log spam
    private static readonly byte[] OpusTagsMagic = Encoding.ASCII.GetBytes("OpusTags");
    private static readonly byte[] VorbisTagMagic = { 0x03, (byte)'v', (byte)'o', (byte)'r', (byte)'b', (byte)'i', (byte)'s' };

    public bool IsLive { get; private set; }
    public string ContentType { get; private set; } = "audio/mpeg";
    public string StationName { get; private set; } = "GuildedThorn Radio";
    public string Title { get; private set; } = "";
    public string Artist { get; private set; } = "";
    public int ListenerCount => _listeners.Count;

    // Claim the single source slot. Returns false if someone is already live,
    // which is how we enforce one broadcaster at a time.
    public bool TryStartSource(string? contentType, string? stationName) {
        lock (_sourceLock) {
            if (IsLive) return false;
            IsLive = true;
            ContentType = NormalizeContentType(contentType, out var sniff);
            _sniffCodec = sniff;
            _scanOggMeta = ContentType.Contains("ogg", StringComparison.OrdinalIgnoreCase);
            _oggTagsSeen = false;
            _lastMetaLog = "\0";
            lock (_metaLock) _metaScan.Clear();
            if (!string.IsNullOrWhiteSpace(stationName)) StationName = stationName;
            Title = "";
            Artist = "";
            lock (_hdrLock) {
                _headerBytes = Array.Empty<byte>();
                _capturing = ContentType.Contains("ogg", StringComparison.OrdinalIgnoreCase);
                _captureBuf = _capturing ? new List<byte>() : null;
            }
            return true;
        }
    }

    public void StopSource() {
        lock (_sourceLock) {
            if (!IsLive) return;
            IsLive = false;
            Title = "";
            Artist = "";
            _sniffCodec = false;
            _scanOggMeta = false;
        }
        lock (_metaLock) _metaScan.Clear();
        lock (_hdrLock) {
            _headerBytes = Array.Empty<byte>();
            _capturing = false;
            _captureBuf = null;
        }
        // End every listener's stream loop cleanly.
        foreach (var kv in _listeners) kv.Value.Writer.TryComplete();
        _listeners.Clear();
    }

    // chunk must be a buffer the caller no longer mutates (a fresh copy).
    public void Publish(byte[] chunk) {
        if (chunk.Length == 0) return;
        if (_sniffCodec) SniffCodec(chunk);
        if (_capturing) CaptureHeader(chunk);
        if (_scanOggMeta) ScanOggMetadata(chunk);
        foreach (var kv in _listeners) kv.Value.Writer.TryWrite(chunk);
    }

    // Map whatever the source labeled itself to a MIME a browser <audio> can
    // actually decode. Mixxx/libshout commonly mislabels AAC as audio/mpeg (the
    // historical Icecast "MP3 path") or sends audio/aacp, so when the label is
    // ambiguous we defer to sniffing the bitstream (see SniffCodec).
    private static string NormalizeContentType(string? contentType, out bool sniff) {
        sniff = false;
        if (string.IsNullOrWhiteSpace(contentType)) { sniff = true; return "audio/mpeg"; }
        var ct = contentType.Trim().ToLowerInvariant();
        if (ct.Contains("ogg")) return "audio/ogg";
        if (ct.Contains("aac")) return "audio/aac";            // audio/aac, audio/aacp, application/aac
        if (ct.Contains("mpeg") || ct.Contains("mp3")) { sniff = true; return "audio/mpeg"; }
        sniff = true;                                           // unknown label — let the bytes decide
        return "audio/mpeg";
    }

    // MP3 and ADTS-AAC frames both start with an 0xFF sync, but the 2 "layer"
    // bits are always 00 for ADTS and non-zero for MP3 — enough to tell them
    // apart from the first frame and serve the correct MIME.
    private void SniffCodec(byte[] chunk) {
        for (var i = 0; i + 1 < chunk.Length; i++) {
            if (chunk[i] != 0xFF) continue;
            var b1 = chunk[i + 1];
            if ((b1 & 0xE0) != 0xE0) continue;        // not a frame sync
            if ((b1 & 0xF6) == 0xF0) {                // 12-bit sync + layer 00 → ADTS/AAC
                ContentType = "audio/aac";
                _sniffCodec = false;
                return;
            }
            if ((b1 & 0x06) != 0x00) {                // layer non-zero → MPEG audio (MP3)
                ContentType = "audio/mpeg";
                _sniffCodec = false;
                return;
            }
        }
        // No usable sync in this chunk; try the next one.
    }

    // Accumulate Ogg pages from the start of the stream until the first audio
    // page (granule position > 0). Everything before it is the header block
    // (OpusHead + OpusTags) that new listeners need to start decoding.
    private void CaptureHeader(byte[] chunk) {
        lock (_hdrLock) {
            if (!_capturing || _captureBuf is null) return;
            _captureBuf.AddRange(chunk);
            var buf = _captureBuf;
            var offset = 0;

            while (offset + 27 <= buf.Count) {
                // "OggS" page sync. The source stream is page-aligned from the
                // start; if it isn't, give up rather than serve garbage.
                if (buf[offset] != 0x4F || buf[offset + 1] != 0x67 ||
                    buf[offset + 2] != 0x67 || buf[offset + 3] != 0x53) {
                    _capturing = false;
                    _captureBuf = null;
                    return;
                }

                int segCount = buf[offset + 26];
                if (offset + 27 + segCount > buf.Count) return; // need more bytes
                var bodyLen = 0;
                for (var i = 0; i < segCount; i++) bodyLen += buf[offset + 27 + i];
                var pageLen = 27 + segCount + bodyLen;
                if (offset + pageLen > buf.Count) return; // need full page body

                long granule = 0;
                for (var i = 0; i < 8; i++) granule |= (long)buf[offset + 6 + i] << (8 * i);
                if (granule > 0) {
                    // First audio page — headers are everything before it.
                    _headerBytes = buf.GetRange(0, offset).ToArray();
                    _capturing = false;
                    _captureBuf = null;
                    return;
                }
                offset += pageLen;
            }

            // Safety valve: never buffer headers unboundedly.
            if (buf.Count > 131072) {
                _headerBytes = buf.GetRange(0, offset).ToArray();
                _capturing = false;
                _captureBuf = null;
            }
        }
    }

    // Scan the Ogg byte stream for the most recent OpusTags / Vorbis comment
    // header and apply its TITLE/ARTIST. The source re-sends this block on each
    // track change, which is how "now playing" updates for Opus/Vorbis (MP3/AAC
    // instead use the out-of-band /admin/metadata path).
    private void ScanOggMetadata(byte[] chunk) {
        lock (_metaLock) {
            _metaScan.AddRange(chunk);
            const int cap = 64 * 1024;
            if (_metaScan.Count > cap) _metaScan.RemoveRange(0, _metaScan.Count - cap);

            // Position just past whichever comment magic we find (the comment
            // payload that follows has the same VorbisComment layout for both).
            int after;
            var pos = LastIndexOf(_metaScan, OpusTagsMagic);
            if (pos >= 0) after = pos + OpusTagsMagic.Length;
            else {
                pos = LastIndexOf(_metaScan, VorbisTagMagic);
                if (pos < 0) return;
                after = pos + VorbisTagMagic.Length;
            }

            if (!_oggTagsSeen) {
                _oggTagsSeen = true;
                _logger.LogInformation("Radio: in-band Ogg comment header (OpusTags/Vorbis) detected");
            }
            TryApplyVorbisComment(_metaScan, after);
        }
    }

    // VorbisComment layout: u32 vendor_len, vendor, u32 count, then count×
    // (u32 len, "KEY=VALUE"), all integers little-endian. Returns quietly if the
    // block isn't fully buffered yet — the next chunk completes it. Length guards
    // keep a false-positive magic in audio data from setting garbage.
    private void TryApplyVorbisComment(List<byte> buf, int pos) {
        try {
            if (pos + 4 > buf.Count) return;
            var vendorLen = ReadU32(buf, pos); pos += 4;
            if (vendorLen > 100_000) return;
            pos += (int)vendorLen;
            if (pos + 4 > buf.Count) return;
            var count = ReadU32(buf, pos); pos += 4;
            if (count > 1024) return;

            string? title = null, artist = null;
            for (uint c = 0; c < count; c++) {
                if (pos + 4 > buf.Count) return;
                var len = ReadU32(buf, pos); pos += 4;
                if (len > 100_000 || pos + (int)len > buf.Count) return;
                var text = Encoding.UTF8.GetString(buf.GetRange(pos, (int)len).ToArray());
                pos += (int)len;
                var eq = text.IndexOf('=');
                if (eq <= 0) continue;
                var key = text[..eq].ToUpperInvariant();
                if (key == "TITLE") title = text[(eq + 1)..];
                else if (key == "ARTIST") artist = text[(eq + 1)..];
            }
            if (!string.IsNullOrWhiteSpace(title)) Title = title.Trim();
            if (!string.IsNullOrWhiteSpace(artist)) Artist = artist.Trim();

            // Diagnostic: log once per distinct parse (incl. empty) so we can see
            // whether the OpusTags actually carries per-track title/artist.
            var logKey = $"{artist}{title}";
            if (logKey != _lastMetaLog) {
                _lastMetaLog = logKey;
                _logger.LogInformation("Radio: parsed Ogg comment artist='{Artist}' title='{Title}'", artist, title);
            }
        } catch {
            // malformed / partially-buffered block — ignore
        }
    }

    private static int LastIndexOf(List<byte> haystack, byte[] needle) {
        for (var i = haystack.Count - needle.Length; i >= 0; i--) {
            var match = true;
            for (var j = 0; j < needle.Length; j++) {
                if (haystack[i + j] != needle[j]) { match = false; break; }
            }
            if (match) return i;
        }
        return -1;
    }

    private static uint ReadU32(List<byte> buf, int pos) =>
        (uint)(buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16) | (buf[pos + 3] << 24));

    // Mixxx sends "Artist - Title" in a single field.
    public void UpdateMetadata(string song) {
        if (string.IsNullOrWhiteSpace(song)) return;
        var idx = song.IndexOf(" - ", StringComparison.Ordinal);
        if (idx >= 0) {
            Artist = song[..idx].Trim();
            Title = song[(idx + 3)..].Trim();
        } else {
            Title = song.Trim();
            Artist = "";
        }
    }

    // Returns the cached Ogg header block (empty for MP3) so the caller can
    // write it before the live data, then the live reader.
    public (Guid id, byte[] header, ChannelReader<byte[]> reader) AddListener() {
        byte[] header;
        lock (_hdrLock) header = _headerBytes;

        // Bounded + DropOldest: a slow listener loses old audio instead of
        // stalling the source pump or ballooning memory.
        var channel = Channel.CreateBounded<byte[]>(new BoundedChannelOptions(256) {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false,
        });
        var id = Guid.NewGuid();
        _listeners[id] = channel;
        return (id, header, channel.Reader);
    }

    public void RemoveListener(Guid id) {
        if (_listeners.TryRemove(id, out var channel)) channel.Writer.TryComplete();
    }
}
