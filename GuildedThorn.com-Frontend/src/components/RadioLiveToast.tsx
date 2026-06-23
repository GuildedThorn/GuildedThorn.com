import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { Radio as RadioIcon, Heart, X } from "lucide-react";
import { Avatar } from "@components/ui/Avatar";

interface Toast {
    title: ReactNode;
    cta: string;
    to: string;
    pulse: boolean;
    icon: ReactNode;
}

interface DonationEvent {
    userName?: string | null;
    displayName?: string | null;
    amountCents: number;
    currency: string;
    avatarUrl?: string | null;
}

function formatMoney(cents: number, currency: string) {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: (currency || "usd").toUpperCase(),
        maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
}

// Site-wide listener for the anonymous RadioHub — the shared bus for instant
// in-app toasts (radio going live, a new stream scheduled, a new donation).
// Off-site people get Web Push instead.
function RadioLiveToast() {
    const [toast, setToast] = useState<Toast | null>(null);

    useEffect(() => {
        // Relative URL: proxied to the backend in dev, same origin in prod.
        const connection = new HubConnectionBuilder()
            .withUrl("/radiohub", { withCredentials: true })
            .withAutomaticReconnect()
            // None: this connects on every page; a proxy/sandbox that blocks the
            // WebSocket transport logs at error level even though SignalR falls
            // back to SSE/long-polling. Toasts are non-critical — keep the
            // console clean rather than surface a transport that self-heals.
            .configureLogging(LogLevel.None)
            .build();

        // RadioHub also broadcasts ListenerCount to every connection; this toast
        // doesn't use it, but registering a no-op avoids the client's noisy
        // "No client method with the name 'listenercount' found" warning.
        connection.on("ListenerCount", () => {});

        connection.on("RadioLive", (info: { name?: string }) => {
            setToast({
                title: `${info?.name || "GuildedThorn Radio"} is live`,
                cta: "Tune in now →",
                to: "/radio",
                pulse: true,
                icon: (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <RadioIcon size={18} className="animate-pulse" />
                    </span>
                ),
            });
        });

        connection.on("StreamScheduled", (info: { title?: string; date?: string; time?: string }) => {
            const when = [info?.date, info?.time].filter(Boolean).join(" ");
            setToast({
                title: `New stream scheduled: ${info?.title ?? "Untitled"}${when ? ` (${when})` : ""}`,
                cta: "View schedule →",
                to: "/radio",
                pulse: false,
                icon: (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <RadioIcon size={18} />
                    </span>
                ),
            });
        });

        // New donation. Logged-in donors get the @account reward (username +
        // avatar); guests show the name they typed (or "Someone").
        connection.on("Donation", (d: DonationEvent) => {
            const amount = formatMoney(d.amountCents, d.currency);
            // Logged-in donors get a profile link; guests show plain text.
            const who = d.userName ? (
                <Link
                    to={`/u/${d.userName}`}
                    className="font-semibold text-primary hover:underline"
                    onClick={() => setToast(null)}
                >
                    @{d.userName}
                </Link>
            ) : (
                <span className="font-semibold">{d.displayName?.trim() || "Someone"}</span>
            );
            setToast({
                title: (
                    <>
                        {who} donated {amount} 💛
                    </>
                ),
                cta: "Support the stream →",
                to: "/donate",
                pulse: true,
                icon: d.userName ? (
                    <Avatar
                        src={d.avatarUrl}
                        name={d.displayName ?? d.userName}
                        className="h-8 w-8 text-xs"
                    />
                ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Heart size={18} />
                    </span>
                ),
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
                {toast.icon}
                <div className="text-left">
                    <p className="text-sm">{toast.title}</p>
                    <Link to={toast.to} className="text-xs text-primary hover:underline" onClick={() => setToast(null)}>
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
