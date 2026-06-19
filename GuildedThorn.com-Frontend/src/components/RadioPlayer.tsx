import { useState, useEffect, useRef } from "react";

// Lightweight standalone radio player. Talks to our own backend (RadioController)
// — the same endpoints the full /radio page uses — via relative URLs, so it's
// proxied in dev and same-origin in prod. Embeddable anywhere.
const STREAM_URL = "/api/radio/stream";
const STATUS_URL = "/api/radio/status";

// Shape of GET /api/radio/status.
interface RadioStatus {
    online: boolean;
    name?: string;
    title?: string;
    artist?: string;
    listeners?: number;
}

function RadioPlayer() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [online, setOnline] = useState<boolean | null>(null);
    const [nowPlaying, setNowPlaying] = useState("Loading…");
    const audioRef = useRef<HTMLAudioElement>(null);

    // Poll our backend status endpoint for on-air state + "now playing".
    useEffect(() => {
        let active = true;

        const fetchStatus = async () => {
            try {
                const res = await fetch(STATUS_URL, { cache: "no-store" });
                if (!res.ok) throw new Error(`status ${res.status}`);
                const data = (await res.json()) as RadioStatus;
                if (!active) return;

                setOnline(data.online);
                if (!data.online) {
                    setNowPlaying("Stream offline");
                } else {
                    const parts = [data.artist, data.title].filter(Boolean);
                    setNowPlaying(parts.length ? parts.join(" — ") : "Live");
                }
            } catch {
                if (active) {
                    setOnline(false);
                    setNowPlaying("Stream offline");
                }
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 10000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, []);

    // If the broadcast ends while we're playing, reset the button state.
    useEffect(() => {
        if (online === false && isPlaying) {
            audioRef.current?.pause();
            setIsPlaying(false);
        }
    }, [online, isPlaying]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            // Reload so playback starts at the live edge, not stale buffered audio.
            audio.load();
            audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }
    };

    return (
        <div className="panel flex flex-col items-center space-y-4 p-4">
            <audio ref={audioRef} src={STREAM_URL} preload="none" />
            <button
                onClick={togglePlay}
                disabled={online === false}
                className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground
                    shadow-sm transition-colors hover:bg-primary/90 hover:text-primary-foreground
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isPlaying ? "Pause" : "Play"}
            </button>
            <div className="text-center">
                <p className="text-lg font-semibold">
                    {online === null ? "Checking…" : online ? "Now Playing:" : "Offline"}
                </p>
                <p className="italic text-muted-foreground">{nowPlaying}</p>
            </div>
        </div>
    );
}

export default RadioPlayer;
