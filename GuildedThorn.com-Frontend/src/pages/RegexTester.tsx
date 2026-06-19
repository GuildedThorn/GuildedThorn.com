import { useState, useEffect } from "react";
import { Input } from "@components/ui/Input";
import { Textarea } from "@components/ui/TextArea";

export default function RegexTester() {
    const [text, setText] = useState("");
    const [pattern, setPattern] = useState("");
    const [flags, setFlags] = useState({ g: true, i: false, m: false });
    const [matches, setMatches] = useState<string[]>([]);

    useEffect(() => {
        try {
            const flagString = Object.entries(flags)
                .filter(([, v]) => v)
                .map(([k]) => k)
                .join("");
            const regex = new RegExp(pattern, flagString);
            const allMatches = [...text.matchAll(regex)].map((m) => m[0]);
            setMatches(allMatches);
        } catch {
            setMatches([]);
        }
    }, [pattern, flags, text]);

    const toggleFlag = (flag: keyof typeof flags) => {
        setFlags((prev) => ({ ...prev, [flag]: !prev[flag] }));
    };

    const highlightMatches = () => {
        if (!pattern) return text;
        const flagString = Object.entries(flags)
            .filter(([, v]) => v)
            .map(([k]) => k)
            .join("");
        try {
            const regex = new RegExp(`(${pattern})`, flagString);
            return text.split(regex).map((part, i) =>
                part && new RegExp(`^${pattern}$`, flagString).test(part) ? (
                    <mark key={i} className="rounded px-0.5 bg-yellow-200 text-black">{part}</mark>
                ) : (
                    part
                )
            );

        } catch {
            return text;
        }
    };

    return (
        <div className="panel h-full p-6 text-left">
            <h2 className="mb-4 text-xl font-bold">Regex Tester</h2>

            <div className="mb-4">
                <label htmlFor="regex-pattern" className="field-label">
                    Regex Pattern
                </label>
                <Input
                    id="regex-pattern"
                    type="text"
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    placeholder="e.g. \d{3}-\d{2}-\d{4}"
                    className="font-mono"
                />
            </div>

            <div className="mb-4 flex gap-4">
                {(["g", "i", "m"] as const).map((flag) => (
                    <label key={flag} className="flex cursor-pointer items-center gap-1.5 font-mono text-sm">
                        <input
                            type="checkbox"
                            checked={flags[flag]}
                            onChange={() => toggleFlag(flag)}
                            className="h-4 w-4 accent-primary"
                        />
                        {flag}
                    </label>
                ))}
            </div>

            <div className="mb-4">
                <label htmlFor="regex-text" className="field-label">
                    Text to Test
                </label>
                <Textarea
                    id="regex-text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={6}
                    className="font-mono"
                    placeholder="Paste your text here..."
                />
            </div>

            <div className="mb-4">
                <p className="mb-1.5 text-sm font-medium text-foreground/80">Highlighted Matches</p>
                <div className="min-h-24 w-full whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/50 p-3 font-mono text-sm">
                    {highlightMatches()}
                </div>
            </div>

            <div>
                <p className="mb-1.5 text-sm font-medium text-foreground/80">Match Results</p>
                <ul className="max-h-32 list-inside list-disc overflow-auto rounded-lg border border-border bg-muted/50 p-3 font-mono text-sm">
                    {matches.length === 0
                        ? <li className="text-muted-foreground">No matches</li>
                        : matches.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
            </div>
        </div>
    );
}
