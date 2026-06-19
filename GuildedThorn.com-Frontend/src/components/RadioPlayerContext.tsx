import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { type HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";

// Relative URLs: proxied in dev, same origin in prod.
const STREAM_URL = "/api/radio/stream";
const STATUS_URL = "/api/radio/status";
const RADIO_HUB_URL = "/radiohub";

interface RadioStatus {
    online: boolean;
    name?: string;
    title?: string;
    artist?: string;
    listeners?: number;
}

interface RadioPlayerValue {
    online: boolean | null;
    playing: boolean;
    loading: boolean;
    title: string;
    artist: string;
    listeners: number;
    volume: number;
    muted: boolean;
    toggle: () => void;
    play: () => void;
    pause: () => void;
    setVolume: (v: number) => void;
    toggleMute: () => void;
}

const RadioPlayerContext = createContext<RadioPlayerValue | null>(null);

export function useRadioPlayer(): RadioPlayerValue {
    const ctx = useContext(RadioPlayerContext);
    if (!ctx) throw new Error("useRadioPlayer must be used within <RadioPlayerProvider>");
    return ctx;
}

// Owns the single <audio> element ABOVE the router, so playback survives route
// changes — start the radio on /radio and keep listening anywhere on the site.
export function RadioPlayerProvider({ children }: { children: ReactNode }) {
    const [online, setOnline] = useState<boolean | null>(null);
    const [playing, setPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [artist, setArtist] = useState("");
    const [listeners, setListeners] = useState(0);
    const [volume, setVolumeState] = useState(0.8);
    const [muted, setMuted] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const hubRef = useRef<HubConnection | null>(null);

    // Create the element once; it lives for the app's lifetime.
    useEffect(() => {
        const a = new Audio();
        a.preload = "none";
        a.volume = volume;
        audioRef.current = a;
        return () => {
            a.pause();
            a.removeAttribute("src");
            a.load();
            audioRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Poll on-air state + now-playing (skip while the tab is hidden).
    useEffect(() => {
        let active = true;
        const check = async () => {
            if (typeof document !== "undefined" && document.hidden) return;
            try {
                const res = await fetch(STATUS_URL, { cache: "no-store" });
                if (!res.ok) throw new Error(`status ${res.status}`);
                const data = (await res.json()) as RadioStatus;
                if (!active) return;
                setOnline(data.online);
                if (typeof data.listeners === "number") setListeners(data.listeners);
                if (data.online) {
                    setTitle(data.title || "");
                    setArtist(data.artist || "");
                }
            } catch {
                if (active) setOnline(false);
            }
        };
        check();
        const id = setInterval(check, 12000);
        return () => {
            active = false;
            clearInterval(id);
        };
    }, []);

    // Play/pause. Every Play reconnects to the live edge (fresh load) so both
    // MP3 and Ogg/Opus start cleanly; Stop fully detaches from the endless stream.
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onPlaying = () => setLoading(false);
        const onWaiting = () => setLoading(true);
        const onEnded = () => setPlaying(false); // source went offline
        const onError = () => {
            setLoading(false);
            setPlaying(false);
        };
        audio.addEventListener("playing", onPlaying);
        audio.addEventListener("waiting", onWaiting);
        audio.addEventListener("ended", onEnded);
        audio.addEventListener("error", onError);

        if (playing) {
            setLoading(true);
            audio.src = STREAM_URL;
            audio.load();
            audio.play().catch(() => setPlaying(false));
        } else {
            audio.pause();
            audio.removeAttribute("src");
            audio.load();
            setLoading(false);
        }

        return () => {
            audio.removeEventListener("playing", onPlaying);
            audio.removeEventListener("waiting", onWaiting);
            audio.removeEventListener("ended", onEnded);
            audio.removeEventListener("error", onError);
        };
    }, [playing]);

    // Realtime listener count, but only while actually listening.
    useEffect(() => {
        if (!playing) return;
        const conn = new HubConnectionBuilder()
            .withUrl(RADIO_HUB_URL, { withCredentials: true })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.Warning)
            .build();
        hubRef.current = conn;
        conn.on("ListenerCount", (count: number) => setListeners(count));
        // No-ops: these are broadcast to all RadioHub clients (handled elsewhere).
        conn.on("RadioLive", () => {});
        conn.on("StreamScheduled", () => {});
        conn.start().catch((err) => console.warn("RadioHub connect failed", err));
        return () => {
            hubRef.current = null;
            void conn.stop();
        };
    }, [playing]);

    // OS-level media controls (lock screen, media keys, notification).
    useEffect(() => {
        if (!("mediaSession" in navigator)) return;
        const ms = navigator.mediaSession;
        if (playing) {
            try {
                ms.metadata = new MediaMetadata({
                    title: title || "GuildedThorn Radio",
                    artist: artist || "Live",
                    album: "GuildedThorn Radio",
                });
            } catch {
                /* MediaMetadata unsupported — ignore */
            }
            ms.playbackState = "playing";
            ms.setActionHandler("play", () => setPlaying(true));
            ms.setActionHandler("pause", () => setPlaying(false));
            ms.setActionHandler("stop", () => setPlaying(false));
        } else {
            ms.playbackState = "paused";
        }
    }, [playing, title, artist]);

    const toggle = useCallback(() => setPlaying((p) => !p), []);
    const play = useCallback(() => setPlaying(true), []);
    const pause = useCallback(() => setPlaying(false), []);

    const setVolume = useCallback((v: number) => {
        setVolumeState(v);
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = v;
        if (v > 0 && audio.muted) {
            audio.muted = false;
            setMuted(false);
        }
    }, []);

    const toggleMute = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.muted = !audio.muted;
        setMuted(audio.muted);
    }, []);

    const value: RadioPlayerValue = {
        online,
        playing,
        loading,
        title,
        artist,
        listeners,
        volume,
        muted,
        toggle,
        play,
        pause,
        setVolume,
        toggleMute,
    };

    return <RadioPlayerContext.Provider value={value}>{children}</RadioPlayerContext.Provider>;
}
