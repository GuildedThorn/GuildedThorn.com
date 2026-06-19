import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Pause, Play, Timer, X } from "lucide-react";
import { usePomodoro } from "@components/PomodoroContext";
import { cn } from "@lib/utils";

const fmt = (total: number) => {
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
};

// Floating countdown that follows you around the site once the Pomodoro is
// running, so it keeps going when you leave /tools. Hidden on /tools (the full
// timer is there) and until you've started a session.
export default function PomodoroMini() {
    const { mode, running, secondsLeft, toggle, reset } = usePomodoro();
    const location = useLocation();
    const [activated, setActivated] = useState(false);

    useEffect(() => {
        if (running) setActivated(true);
    }, [running]);

    if (location.pathname === "/tools") return null;
    if (!activated) return null;

    return (
        <div className="fixed bottom-20 left-4 z-40 print:hidden">
            <div className="flex items-center gap-3 rounded-full border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
                <button
                    onClick={toggle}
                    aria-label={running ? "Pause timer" : "Resume timer"}
                    className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors",
                        mode === "work" ? "bg-primary hover:bg-primary/90" : "bg-success hover:bg-success/90",
                    )}
                >
                    {running ? <Pause size={16} /> : <Play size={16} />}
                </button>

                <Link to="/tools#pomodoro" className="flex items-center gap-2" title="Open Pomodoro">
                    <Timer size={14} className="shrink-0 text-muted-foreground" />
                    <div className="leading-tight">
                        <p className="font-mono text-sm font-semibold tabular-nums">{fmt(secondsLeft)}</p>
                        <p className="text-[10px] text-muted-foreground">
                            {mode === "work" ? "Work" : "Break"}
                        </p>
                    </div>
                </Link>

                <button
                    onClick={() => {
                        reset();
                        setActivated(false);
                    }}
                    aria-label="Reset and hide"
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
