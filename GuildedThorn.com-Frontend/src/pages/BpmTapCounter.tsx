import { useRef, useState } from "react";
import { Button } from "@components/ui/Button";

// Tap a button (click, or Space/Enter while focused) in time with a track; the
// running average of the last few intervals gives the tempo. A long pause resets.
const RESET_MS = 2000;
const MAX_INTERVALS = 8;

export default function BpmTapCounter() {
    const taps = useRef<number[]>([]);
    const [bpm, setBpm] = useState<number | null>(null);
    const [count, setCount] = useState(0);

    const tap = () => {
        const now = performance.now();
        const list = taps.current;
        if (list.length && now - list[list.length - 1] > RESET_MS) list.length = 0;
        list.push(now);
        if (list.length > MAX_INTERVALS + 1) list.shift();
        setCount(list.length);
        if (list.length >= 2) {
            const avg = (list[list.length - 1] - list[0]) / (list.length - 1);
            setBpm(Math.round((60000 / avg) * 10) / 10);
        } else {
            setBpm(null);
        }
    };

    const reset = () => {
        taps.current = [];
        setBpm(null);
        setCount(0);
    };

    return (
        <div className="panel h-full p-6 text-left">
            <h2 className="mb-4 text-xl font-bold">BPM Tap Counter</h2>

            <div className="mb-4 text-center">
                <p className="text-5xl font-bold tabular-nums">{bpm ?? "—"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    {count > 0 ? `${count} tap${count === 1 ? "" : "s"}` : "BPM"}
                </p>
            </div>

            <Button onClick={tap} className="h-20 w-full text-lg">
                Tap
            </Button>
            <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    Click, or focus + press Space/Enter.
                </p>
                <Button variant="outline" size="sm" onClick={reset}>
                    Reset
                </Button>
            </div>
        </div>
    );
}
