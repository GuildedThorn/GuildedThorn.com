import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { type HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { Ban, Crown, Shield, ShieldAlert, Trash2 } from "lucide-react";
import { Avatar } from "@components/ui/Avatar";
import { Button } from "@components/ui/Button";
import { Card } from "@components/ui/Card";
import { useAuth } from "@components/AuthContext";
import { getChatHistory, type ChatMessage } from "@backend/api";

// Relative URL: proxied to the backend in dev, same origin in prod.
const CHAT_HUB_URL = "/chathub";

// Self-contained live chat: history load, SignalR with auto-reconnect, avatars,
// owner moderation (delete / ban / clear) and an anti-raid toggle.
export default function ChatPanel() {
    const { user, isAuthenticated } = useAuth();
    const isOwner = user?.role === "owner";

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [connecting, setConnecting] = useState(true);
    const [antiRaid, setAntiRaid] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    const connRef = useRef<HubConnection | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    // Seed from the database.
    useEffect(() => {
        let active = true;
        getChatHistory()
            .then((data) => {
                if (!active) return;
                setMessages(data.messages);
                setAntiRaid(data.antiRaid);
            })
            .catch((err) => console.warn("Chat history failed", err));
        return () => {
            active = false;
        };
    }, []);

    // Live connection.
    useEffect(() => {
        const conn = new HubConnectionBuilder()
            .withUrl(CHAT_HUB_URL, { withCredentials: true })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.Warning)
            .build();
        connRef.current = conn;

        conn.on("ReceiveMessage", (m: ChatMessage) => setMessages((prev) => [...prev, m]));
        conn.on("MessageDeleted", (id: string) => setMessages((prev) => prev.filter((m) => m.id !== id)));
        conn.on("UserBanned", (u: string) => setMessages((prev) => prev.filter((m) => m.user !== u)));
        conn.on("ChatCleared", () => setMessages([]));
        conn.on("AntiRaidChanged", (on: boolean) => setAntiRaid(on));
        conn.on("ChatError", (msg: string) => setNotice(msg));

        conn.onreconnecting(() => setConnecting(true));
        conn.onreconnected(() => setConnecting(false));
        conn.onclose(() => setConnecting(true));

        conn.start()
            .then(() => setConnecting(false))
            .catch((err) => console.error("Chat connection failed", err));

        return () => {
            connRef.current = null;
            void conn.stop();
        };
    }, []);

    // Keep pinned to the latest message.
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages]);

    // Auto-dismiss transient notices (slow mode / ban rejections).
    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => setNotice(null), 4000);
        return () => clearTimeout(t);
    }, [notice]);

    const send = useCallback(async () => {
        const text = draft.trim();
        const conn = connRef.current;
        if (!text || !conn || conn.state !== "Connected") return;
        try {
            await conn.invoke("SendMessage", text);
            setDraft("");
        } catch (err) {
            console.error("Send failed", err);
        }
    }, [draft]);

    const deleteMessage = (id: string) => connRef.current?.invoke("DeleteMessage", id).catch(console.error);
    const banUser = (u: string) => {
        if (confirm(`Ban ${u} from chat? Their messages will be removed.`)) {
            connRef.current?.invoke("BanUser", u).catch(console.error);
        }
    };
    const toggleAntiRaid = () => connRef.current?.invoke("SetAntiRaid", !antiRaid).catch(console.error);
    const clearChat = () => {
        if (confirm("Clear the entire chat for everyone?")) {
            connRef.current?.invoke("ClearChat").catch(console.error);
        }
    };

    const fmtTime = (ts: string) => {
        const d = new Date(ts);
        return isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <Card className="flex flex-col">
            {/* Header */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <h3 className="flex shrink-0 items-center gap-2 text-sm font-semibold">
                    Chat
                    {antiRaid && (
                        <span
                            className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                            title="Anti-raid mode is on: slow mode + new accounts blocked"
                        >
                            <ShieldAlert size={12} /> Anti-raid
                        </span>
                    )}
                </h3>
                {isOwner && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant={antiRaid ? "destructive" : "outline"}
                            size="sm"
                            onClick={toggleAntiRaid}
                            title="Slow mode + block brand-new accounts"
                        >
                            <Shield size={14} />
                            <span className="hidden sm:inline">
                                {antiRaid ? "Anti-raid: on" : "Anti-raid: off"}
                            </span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={clearChat} title="Clear chat for everyone">
                            Clear
                        </Button>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="max-h-80 flex-1 space-y-1 overflow-y-auto text-left">
                {messages.length === 0 ? (
                    <div className="py-4 text-center text-muted-foreground">No messages yet</div>
                ) : (
                    messages.map((m) => (
                        <div key={m.id} className="group flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                            <Avatar src={m.avatarUrl} name={m.user} className="h-7 w-7 text-xs" />
                            <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center gap-1.5">
                                    <Link
                                        to={`/u/${m.user}`}
                                        className="min-w-0 truncate text-sm font-semibold hover:text-primary hover:underline"
                                    >
                                        {m.user}
                                    </Link>
                                    {m.role === "owner" && (
                                        <Crown size={12} className="shrink-0 text-amber-500" aria-label="Owner" />
                                    )}
                                    <span className="shrink-0 text-[10px] text-muted-foreground">
                                        {fmtTime(m.timestamp)}
                                    </span>
                                </div>
                                <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{m.content}</p>
                            </div>
                            {isOwner && (
                                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    <button
                                        onClick={() => deleteMessage(m.id)}
                                        title="Delete message"
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => banUser(m.user)}
                                        title={`Ban ${m.user}`}
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        <Ban size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {connecting && <div className="py-1 text-center text-xs text-muted-foreground">Connecting to chat…</div>}
            {notice && <div className="py-1 text-center text-xs text-destructive">{notice}</div>}

            {/* Composer */}
            <div className="mt-3 flex items-center gap-2">
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    disabled={!isAuthenticated}
                    maxLength={500}
                    placeholder={isAuthenticated ? "Type a message" : "Sign in to chat"}
                    className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2
                        text-sm shadow-sm placeholder:text-muted-foreground transition-colors
                        focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <Button onClick={send} disabled={!isAuthenticated || !draft.trim()} className="shrink-0">
                    Send
                </Button>
            </div>
        </Card>
    );
}
