import { useState, useEffect, useRef } from "react";
import { Card } from "@components/ui/Card.tsx";
import { Button } from "@components/ui/Button.tsx";

const PomodoroTimer = () => {
    const WORK_MINUTES = 25;
    const BREAK_MINUTES = 5;

    const [secondsLeft, setSecondsLeft] = useState(WORK_MINUTES * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [mode, setMode] = useState<"work" | "break">("work");
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const [completedSessions, setCompletedSessions] = useState<number[]>(() => {
        return JSON.parse(localStorage.getItem("pomodoroSessions") || "[]");
    });

    // Timer effect
    useEffect(() => {
        if (isRunning && secondsLeft > 0) {
            timerRef.current = setTimeout(() => {
                setSecondsLeft(secondsLeft - 1);
            }, 1000);
        } else if (secondsLeft === 0 && isRunning) {
            // Play alert
            alert(mode === "work" ? "Work session complete! 🍅" : "Break over! 🛌");

            if (mode === "work") {
                // Log completed work session
                const timestamp = Date.now();
                const updatedSessions = [...completedSessions, timestamp];
                setCompletedSessions(updatedSessions);
                localStorage.setItem("pomodoroSessions", JSON.stringify(updatedSessions));
            }

            // Switch mode
            if (mode === "work") {
                setMode("break");
                setSecondsLeft(BREAK_MINUTES * 60);
            } else {
                setMode("work");
                setSecondsLeft(WORK_MINUTES * 60);
            }
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [secondsLeft, isRunning, mode, completedSessions]);

    // Helper to format time
    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60)
            .toString()
            .padStart(2, "0");
        const seconds = (totalSeconds % 60).toString().padStart(2, "0");
        return `${minutes}:${seconds}`;
    };

    return (
        <div style={{ textAlign: "center", fontFamily: "sans-serif" }}>
            <Card title={"Pomodoro"}>
                <h1 className="font-[Caveat,_cursive] text-2xl mb-2">Pomodoro Timer</h1>
                <h2>{mode === "work" ? "Work Session" : "Break Session"}</h2>
                <div style={{ fontSize: "3rem", margin: "20px 0" }}>
                    {formatTime(secondsLeft)}
                </div>
                <Button onClick={() => setIsRunning(!isRunning)} variant={"outline"}>
                    {isRunning ? "Pause" : "Start"}
                </Button>
                <Button
                    onClick={() => {
                        setIsRunning(false);
                        setMode("work");
                        setSecondsLeft(WORK_MINUTES * 60);
                    }}
                    variant={"outline"}
                    style={{ marginLeft: "10px" }}
                >
                    Reset
                </Button>

                <h3 style={{ marginTop: "30px" }}>Completed Work Sessions</h3>
                <ul>
                    {completedSessions.map((ts, idx) => (
                        <li key={idx}>{new Date(ts).toLocaleString()}</li>
                    ))}
                </ul>
            </Card>
        </div>
    );
};

export default PomodoroTimer;
