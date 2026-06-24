import { useState } from "react";

// Harmonic mixing helper. On the Camelot wheel a track mixes cleanly with: the
// same key, its relative major/minor (same number, swap A/B), and one step either
// way around the wheel (±1, same letter).
const NAMES: Record<string, string> = {
    "1A": "A♭ minor", "1B": "B major",
    "2A": "E♭ minor", "2B": "F♯ major",
    "3A": "B♭ minor", "3B": "D♭ major",
    "4A": "F minor", "4B": "A♭ major",
    "5A": "C minor", "5B": "E♭ major",
    "6A": "G minor", "6B": "B♭ major",
    "7A": "D minor", "7B": "F major",
    "8A": "A minor", "8B": "C major",
    "9A": "E minor", "9B": "G major",
    "10A": "B minor", "10B": "D major",
    "11A": "F♯ minor", "11B": "A major",
    "12A": "D♭ minor", "12B": "E major",
};

// Dropdown order: 1A, 1B, 2A, 2B, … 12B.
const CODES = Array.from({ length: 12 }, (_, i) => i + 1).flatMap((n) => [
    `${n}A`,
    `${n}B`,
]);

function parse(code: string) {
    return { num: parseInt(code, 10), letter: code.slice(-1) };
}

export default function CamelotWheel() {
    const [code, setCode] = useState("8A");
    const { num, letter } = parse(code);

    const up = `${(num % 12) + 1}${letter}`;
    const down = `${((num + 10) % 12) + 1}${letter}`;
    const relative = `${num}${letter === "A" ? "B" : "A"}`;

    const matches = [
        { code, role: "Same key", hint: "perfect blend" },
        { code: relative, role: "Relative", hint: "energy boost / mood swap" },
        { code: up, role: "+1", hint: "raise energy" },
        { code: down, role: "−1", hint: "lower energy" },
    ];

    return (
        <div className="panel h-full p-6 text-left">
            <h2 className="mb-4 text-xl font-bold">Camelot Wheel</h2>

            <label htmlFor="camelot-key" className="field-label">
                Current key
            </label>
            <select
                id="camelot-key"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
                {CODES.map((c) => (
                    <option key={c} value={c}>
                        {c} — {NAMES[c]}
                    </option>
                ))}
            </select>

            <p className="field-label">Mixes well with</p>
            <div className="grid gap-2 sm:grid-cols-2">
                {matches.map((m) => (
                    <div
                        key={m.role}
                        className="rounded-lg border border-border bg-muted/40 p-3"
                    >
                        <div className="flex items-baseline justify-between gap-2">
                            <span className="font-mono font-semibold text-primary">{m.code}</span>
                            <span className="text-xs text-muted-foreground">{m.role}</span>
                        </div>
                        <p className="mt-0.5 text-sm">{NAMES[m.code]}</p>
                        <p className="text-xs text-muted-foreground">{m.hint}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
