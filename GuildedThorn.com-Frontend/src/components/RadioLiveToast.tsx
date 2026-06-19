import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { Radio as RadioIcon, X } from "lucide-react";

interface Toast {
    title: string;
    cta: string;
    pulse: boolean;
}

// Site-wide listener for the anonymous RadioHub. When the station goes live —
// or a new stream is scheduled — the server broadcasts an event and we surface
// an in-app toast to whoever is currently browsing (off-site people get the Web
// Push instead).
function RadioLiveToast() {
    const [toast, setToast] = useState<Toast | null>(null);

    useEffect(() => {
        // Relative URL: proxied to the backend in dev, same origin in prod.
        const connection = new HubConnectionBuilder()
            .withUrl("/radiohub", { withCredentials: true })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.Warning)
            .build();

        // RadioHub also broadcasts ListenerCount to every connection; this toast
        // doesn't use it, but registering a no-op avoids the client's noisy
        // "No client method with the name 'listenercount' found" warning.
        connection.on("ListenerCount", () => {});

        connection.on("RadioLive", (info: { name?: string }) => {
            setToast({ title: `${info?.name || "GuildedThorn Radio"} is live`, cta: "Tune in now →", pulse: true });
        });

        connection.on("StreamScheduled", (info: { title?: string; date?: string; time?: string }) => {
            const when = [info?.date, info?.time].filter(Boolean).join(" ");
            setToast({
                title: `New stream scheduled: ${info?.title ?? "Untitled"}${when ? ` (${when})` : ""}`,
                cta: "View schedule →",
                pulse: false,
            });
        });

        connection.start().catch((err) => console.warn("RadioHub connect failed", err));

        return () => {
            void connection.stop();
        };
    }, []);

    // Auto-dismiss after 15s.
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 15000);
        return () => clearTimeout(t);
    }, [toast]);

    if (!toast) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 print:hidden">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-lg">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <RadioIcon size={18} className={toast.pulse ? "animate-pulse" : undefined} />
                </span>
                <div className="text-left">
                    <p className="text-sm font-semibold">{toast.title}</p>
                    <Link to="/radio" className="text-xs text-primary hover:underline" onClick={() => setToast(null)}>
                        {toast.cta}
                    </Link>
                </div>
                <button
                    onClick={() => setToast(null)}
                    aria-label="Dismiss"
                    className="ml-2 text-muted-foreground hover:text-foreground"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}

export default RadioLiveToast;
