import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

type Mode = "work" | "break";

interface PomodoroValue {
    mode: Mode;
    running: boolean;
    secondsLeft: number;
    completedSessions: number[];
    start: () => void;
    pause: () => void;
    toggle: () => void;
    reset: () => void;
}

const PomodoroContext = createContext<PomodoroValue | null>(null);

export function usePomodoro(): PomodoroValue {
    const ctx = useContext(PomodoroContext);
    if (!ctx) throw new Error("usePomodoro must be used within <PomodoroProvider>");
    return ctx;
}

// Owns the Pomodoro timer ABOVE the router so it keeps running when you leave
// /tools. The countdown is anchored to an absolute end time, so background-tab
// timer throttling can't make it drift.
export function PomodoroProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<Mode>("work");
    const [running, setRunning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(WORK_SECONDS);
    const [completedSessions, setCompletedSessions] = useState<number[]>(() => {
        try {
            return JSON.parse(localStorage.getItem("pomodoroSessions") || "[]");
        } catch {
            return [];
        }
    });

    const endsAtRef = useRef<number | null>(null); // ms timestamp while running
    const secondsLeftRef = useRef(secondsLeft);
    const modeRef = useRef(mode);
    const audioCtxRef = useRef<AudioContext | null>(null);
    secondsLeftRef.current = secondsLeft;
    modeRef.current = mode;

    // --- chimes (same tones as the original page) ---------------------------
    const playChime = useCallback((frequencies: number[]) => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = ctx.currentTime + i * 0.2;
            osc.type = "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
            osc.connect(gain).connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.5);
        });
    }, []);

    const notify = useCallback((body: string) => {
        if ("Notification" in window && Notification.permission === "granted") {
            try {
                new Notification("Pomodoro Timer", { body, icon: "/images/Logo.svg" });
            } catch {
                /* some browsers require the SW path — ignore */
            }
        }
    }, []);

    // End of the current phase: chime + notify, log work sessions, flip mode,
    // and keep running into the next phase.
    const completePhase = useCallback(() => {
        if (modeRef.current === "work") {
            playChime([523.25, 659.25, 783.99]); // ascending: work done
            notify("Work session done — time for a break 🍅");
            const ts = Date.now();
            setCompletedSessions((prev) => {
                const next = [...prev, ts];
                localStorage.setItem("pomodoroSessions", JSON.stringify(next));
                return next;
            });
            setMode("break");
            modeRef.current = "break";
            endsAtRef.current = Date.now() + BREAK_SECONDS * 1000;
            setSecondsLeft(BREAK_SECONDS);
        } else {
            playChime([659.25, 440]); // descending: break over
            notify("Break over — back to work 💪");
            setMode("work");
            modeRef.current = "work";
            endsAtRef.current = Date.now() + WORK_SECONDS * 1000;
            setSecondsLeft(WORK_SECONDS);
        }
    }, [playChime, notify]);

    // Tick while running. Recomputes from the wall-clock end time each tick.
    useEffect(() => {
        if (!running) return;
        const tick = () => {
            const endsAt = endsAtRef.current;
            if (endsAt == null) return;
            const remaining = Math.round((endsAt - Date.now()) / 1000);
            if (remaining <= 0) completePhase();
            else setSecondsLeft(remaining);
        };
        tick();
        const id = setInterval(tick, 250);
        return () => clearInterval(id);
    }, [running, completePhase]);

    const ensureAudio = () => {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        if (audioCtxRef.current.state === "suspended") void audioCtxRef.current.resume();
    };

    const start = useCallback(() => {
        ensureAudio(); // tied to the click gesture so audio is allowed
        if ("Notification" in window && Notification.permission === "default") {
            void Notification.requestPermission();
        }
        endsAtRef.current = Date.now() + secondsLeftRef.current * 1000;
        setRunning(true);
    }, []);

    const pause = useCallback(() => {
        const endsAt = endsAtRef.current;
        if (endsAt != null) setSecondsLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
        endsAtRef.current = null;
        setRunning(false);
    }, []);

    const toggle = useCallback(() => {
        if (running) pause();
        else start();
    }, [running, start, pause]);

    const reset = useCallback(() => {
        endsAtRef.current = null;
        setRunning(false);
        setMode("work");
        modeRef.current = "work";
        setSecondsLeft(WORK_SECONDS);
    }, []);

    const value: PomodoroValue = {
        mode,
        running,
        secondsLeft,
        completedSessions,
        start,
        pause,
        toggle,
        reset,
    };

    return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}
