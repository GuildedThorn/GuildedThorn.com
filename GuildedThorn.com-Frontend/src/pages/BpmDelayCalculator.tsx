import { useState } from "react";
import { Input } from "@components/ui/Input";

// Delay/LFO times for a given tempo. quarter note (ms) = 60000 / BPM; everything
// else scales from it. Dotted = ×1.5, triplet = ×2/3. Hz = 1000 / ms (handy for
// LFO rates and tempo-synced filters).
const DIVISIONS: { label: string; factor: number }[] = [
    { label: "1/1 (whole)", factor: 4 },
    { label: "1/2 (half)", factor: 2 },
    { label: "1/4 (quarter)", factor: 1 },
    { label: "1/8 (eighth)", factor: 0.5 },
    { label: "1/16", factor: 0.25 },
    { label: "1/32", factor: 0.125 },
];

const fmt = (ms: number) => (ms >= 100 ? ms.toFixed(1) : ms.toFixed(2));

export default function BpmDelayCalculator() {
    const [bpm, setBpm] = useState("120");
    const quarter = 60000 / (parseFloat(bpm) || 0);
    const valid = Number.isFinite(quarter) && quarter > 0;

    return (
        <div className="panel h-full p-6 text-left">
            <h2 className="mb-4 text-xl font-bold">BPM → Delay Time</h2>

            <label htmlFor="delay-bpm" className="field-label">
                Tempo (BPM)
            </label>
            <Input
                id="delay-bpm"
                type="number"
                min="1"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                className="mb-4 font-mono"
            />

            {valid ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-muted-foreground">
                                <th className="py-1.5 pr-2 font-medium">Note</th>
                                <th className="py-1.5 px-2 text-right font-medium">Normal</th>
                                <th className="py-1.5 px-2 text-right font-medium">Dotted</th>
                                <th className="py-1.5 pl-2 text-right font-medium">Triplet</th>
                            </tr>
                        </thead>
                        <tbody className="tabular-nums">
                            {DIVISIONS.map(({ label, factor }) => {
                                const ms = quarter * factor;
                                return (
                                    <tr key={label} className="border-b border-border/50">
                                        <td className="py-1.5 pr-2">{label}</td>
                                        <td className="py-1.5 px-2 text-right">{fmt(ms)} ms</td>
                                        <td className="py-1.5 px-2 text-right text-muted-foreground">
                                            {fmt(ms * 1.5)} ms
                                        </td>
                                        <td className="py-1.5 pl-2 text-right text-muted-foreground">
                                            {fmt(ms * (2 / 3))} ms
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <p className="mt-3 text-xs text-muted-foreground">
                        1/4 note = {fmt(quarter)} ms ≈ {(1000 / quarter).toFixed(2)} Hz
                    </p>
                </div>
            ) : (
                <p className="text-sm text-destructive">Enter a tempo above 0.</p>
            )}
        </div>
    );
}
