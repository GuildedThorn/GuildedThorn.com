import { useEffect, useState, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, RefreshCw } from "lucide-react";
import {Button} from "@components/ui/Button";
import {
    HubConnectionBuilder,
    LogLevel,
} from "@microsoft/signalr";
import Slider from "@components/ui/Slider.tsx";
import {Card} from "@components/ui/Card.tsx";

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------
const ICECAST_STREAM_URL = "https://radio.guildedthorn.com"; // <your-mountpoint> can be added if needed
const ICECAST_STATUS_URL = "https://radio.guildedthorn.com/status-json.xsl";

const isLocal = window.location.hostname === "localhost";
const API_URL = isLocal
    ? "https://localhost:7101/chathub"
    : "https://guildedthorn.com/chathub";


// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
interface IcecastSource {
    title?: string;
    artist?: string;
    server_name?: string;
    server_description?: string;
}

const parseIcecastMetadata = (src: IcecastSource | IcecastSource[] | undefined) => {
    if (!src) {
        return { title: "Unknown Title", artist: "Unknown Artist" };
    }

    const entry = Array.isArray(src) ? src[0] : src;

    // Many Icecast setups put "Artist - Title" inside the `title` field only.
    if (entry?.title && !entry.artist) {
        const parts = entry.title.split(" - ");
        return {
            artist: parts[0] || "Unknown Artist",
            title: parts.slice(1).join(" - ") || "Unknown Title",
        };
    }

    return {
        title: entry.title || "Unknown Title",
        artist: entry.artist || "Unknown Artist",
    };
};



// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
function Radio() {
    // ----------------------------- State --------------------------------------
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(0.8);
    // const [volume] = useState(0.8);
    const [muted, setMuted] = useState(false);
    const [metadata, setMetadata] = useState({
        title: "Loading…",
        artist: "Loading…",
    });
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<any[]>([]);
    const [message, setMessage] = useState("");
    const [connecting, setConnecting] = useState(true);
    const [, setOnlineUsers] = useState<string[]>([]);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const connectionRef = useRef<ReturnType<typeof HubConnectionBuilder.prototype.build>>(null);


    const sendMessage = async () => {
        if (!message.trim()) return;
        const conn = connectionRef.current;
        if (!conn || conn.state !== "Connected") {
            console.error("SignalR not connected");
            return;
        }

        const payload = {
            user: "GuildedThorn", // replace with actual user from auth context
            content: message,
            timestamp: new Date().toISOString(),
        };

        try {
            await conn.invoke("SendMessage", payload);
            setMessage("");
        } catch (err) {
            console.error("Send failed", err);
        }
    };


    // ----------------------------- Audio + Meta -------------------------------
    useEffect(() => {
        // Create audio element lazily (SSR‑safe)
        if (!audioRef.current) {
            audioRef.current = new Audio(ICECAST_STREAM_URL);
            audioRef.current.preload = "auto";
            audioRef.current.volume = volume;
        }

        const audio = audioRef.current;

        const fetchMetadata = async () => {
            try {
                const res = await fetch(ICECAST_STATUS_URL, { cache: "no-store" });
                const data = (await res.json()) as any;
                const parsed = parseIcecastMetadata(data?.icestats?.source);
                setMetadata(parsed);
            } catch (err) {
                console.error("Failed to fetch Icecast metadata", err);
            }
        };

        let interval: NodeJS.Timeout | undefined;

        // Loading indicator hooks
        const handlePlaying = () => setLoading(false);
        const handleWaiting = () => setLoading(true);

        audio.addEventListener("playing", handlePlaying);
        audio.addEventListener("waiting", handleWaiting);

        if (playing) {
            // Start stream & metadata polling
            fetchMetadata();
            interval = setInterval(fetchMetadata, 5000);
            audio.play().catch(console.error);
        } else {
            audio.pause();
        }

        return () => {
            interval && clearInterval(interval);
            audio.pause();
            audio.removeEventListener("playing", handlePlaying);
            audio.removeEventListener("waiting", handleWaiting);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playing]);

    // ----------------------------- SignalR ------------------------------------
    useEffect(() => {
        const createConnection = () => {
            return new HubConnectionBuilder()
                .withUrl(API_URL, {
                    withCredentials: true,  // important for cookies/auth
                    // transport: HttpTransportType.WebSockets,  <--- REMOVE this line!
                })
                .configureLogging(LogLevel.Information)
                .build();
        };


        const startConnection = async () => {
            if (connectionRef.current) return;
            const conn = createConnection();
            connectionRef.current = conn;

            conn.onclose(() => {
                console.warn("SignalR disconnected, retrying in 5 s…");
                setConnecting(true);
                setTimeout(startConnection, 5000);
            });

            try {
                await conn.start();
                setConnecting(false);
                console.log("SignalR connected");

                conn.on("ReceiveMessage", (user, msg, timestamp) => {
                    setMessages((prev) => [
                        ...prev,
                        {
                            user,
                            message: msg,
                            timestamp: new Date(timestamp).toLocaleTimeString(),
                        },
                    ]);
                });

                conn.on("UserConnected", (id) => setOnlineUsers((prev) => [...prev, id]));
                conn.on("UserDisconnected", (id) =>
                    setOnlineUsers((prev) => prev.filter((u) => u !== id))
                );
            } catch (err) {
                console.error("SignalR connection failed", err);
                setTimeout(startConnection, 5000);
            }
        };

        // Fire async function (don't return it!)
        void startConnection();

        // ✅ Return sync cleanup function
        return () => {
            if (connectionRef.current) {
                void connectionRef.current.stop(); // silence Promise warning
            }
        };
    }, []);


    // ----------------------------- UI helpers ---------------------------------
    const togglePlayback = () => setPlaying((p) => !p);

    const toggleMute = () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.muted = !muted;
        setMuted(audio.muted);
    };

    const handleVolumeChange = (val: number[]) => {
        const audio = audioRef.current;
        if (!audio) return;
        const v = val[0];
        audio.volume = v;
        setVolume(v);
        if (v > 0 && muted) {
            audio.muted = false;
            setMuted(false);
        }
    };

    // ----------------------------- Render -------------------------------------
    return (
        <div className="section">
            <Card title={"Player"}>
                <div className="p-6">
                    <div className="space-y-4">
                        <div className="text-center space-y-1">
                            <h2 className="font-semibold text-lg truncate">{metadata.title}</h2>
                            <p className="text-sm text-gray-500 truncate">{metadata.artist}</p>
                        </div>

                        {loading && (
                            <div className="flex justify-center">
                                <RefreshCw className="animate-spin" size={24} />
                            </div>
                        )}

                        <div className="flex items-center justify-center space-x-4">
                            <Button variant="outline" onClick={toggleMute} className="hover:bg-gray-100">
                                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </Button>

                            <Button variant="outline" onClick={togglePlayback} className="w-16 h-16 rounded-full">
                                {playing ? <Pause size={32} /> : <Play size={32} />}
                            </Button>

                            <div className="w-24">
                                <Slider value={[volume]} max={1} step={0.01} onValueChange={handleVolumeChange} />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
            <Card title={"Chat"}>
                {/* Chat */}
                <div className="space-y-2 flex-1">
                    {messages.length === 0 ? (
                        <div>No messages yet</div>
                    ) : (
                        messages.map((m, i) => (
                            <div key={i} className="border-b py-2">
                                <strong>{m.user}:</strong> {m.message}
                            </div>
                        ))
                    )}
                </div>

                {connecting && <div className="text-center text-gray-500">Connecting to chat…</div>}

                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type a message"
                        className="flex-1 p-2 border rounded"
                    />
                    <button onClick={sendMessage} className="p-2 bg-blue-500 text-white rounded">
                        Send
                    </button>
                </div>
            </Card>
        </div>
    );
}

export default Radio;
