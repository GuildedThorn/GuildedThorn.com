import { Card } from "@components/ui/Card.tsx";
import { Button } from "@components/ui/Button.tsx";
import { usePomodoro } from "@components/PomodoroContext";

// The timer state now lives in <PomodoroProvider> (above the router) so it keeps
// running when you leave /tools — this is just the full UI for it.
const PomodoroTimer = () => {
    const { mode, running, secondsLeft, completedSessions, toggle, reset } = usePomodoro();

    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
        const seconds = (totalSeconds % 60).toString().padStart(2, "0");
        return `${minutes}:${seconds}`;
    };

    return (
        <div className="h-full text-center">
            <Card className="h-full">
                <h1 className="text-3xl mb-3">Pomodoro Timer</h1>
                <span
                    className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                        mode === "work"
                            ? "bg-primary/10 text-primary"
                            : "bg-success/10 text-success"
                    }`}
                >
                    {mode === "work" ? "Work Session" : "Break Session"}
                </span>

                <div className="my-6 text-6xl font-bold tabular-nums tracking-tight">
                    {formatTime(secondsLeft)}
                </div>

                <div className="flex justify-center gap-3">
                    <Button onClick={toggle}>{running ? "Pause" : "Start"}</Button>
                    <Button onClick={reset} variant={"outline"}>
                        Reset
                    </Button>
                </div>

                <h3 className="mt-8 font-semibold">Completed Work Sessions</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {completedSessions.map((ts, idx) => (
                        <li key={idx}>{new Date(ts).toLocaleString()}</li>
                    ))}
                </ul>
            </Card>
        </div>
    );
};

export default PomodoroTimer;
