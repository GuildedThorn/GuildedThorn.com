import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Pause, Play, Radio as RadioIcon, X } from "lucide-react";
import { useRadioPlayer } from "@components/RadioPlayerContext";

// Floating bar that follows you around the site once the radio is playing, so
// audio keeps going when you leave /radio. Hidden on the /radio page itself
// (the full player is there) and before you've ever started playback.
export default function MiniPlayer() {
    const { playing, loading, title, artist, toggle, pause } = useRadioPlayer();
    const location = useLocation();
    const [activated, setActivated] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (playing) {
            setActivated(true);
            setDismissed(false);
        }
    }, [playing]);

    if (location.pathname === "/radio") return null;
    if (!activated || dismissed) return null;

    return (
        <div className="fixed bottom-4 left-4 z-40 print:hidden">
            <div className="flex items-center gap-3 rounded-full border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
                <button
                    onClick={toggle}
                    aria-label={playing ? "Pause" : "Play"}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary
                        text-primary-foreground transition-colors hover:bg-primary/90"
                >
                    {playing ? <Pause size={16} /> : <Play size={16} />}
                </button>

                <Link to="/radio" className="min-w-0 max-w-[44vw] sm:max-w-xs" title="Open radio">
                    <p className="truncate text-xs font-semibold">{title || "GuildedThorn Radio"}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                        {loading ? "Buffering…" : artist || "Live"}
                    </p>
                </Link>

                <Link
                    to="/radio"
                    aria-label="Open radio page"
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                >
                    <RadioIcon size={16} />
                </Link>
                <button
                    onClick={() => {
                        pause();
                        setDismissed(true);
                    }}
                    aria-label="Stop and hide"
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
