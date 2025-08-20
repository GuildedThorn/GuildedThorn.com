import { useState, useEffect } from "react";

export default function RegexTester() {
    const [text, setText] = useState("");
    const [pattern, setPattern] = useState("");
    const [flags, setFlags] = useState({ g: true, i: false, m: false });
    const [matches, setMatches] = useState<string[]>([]);

    useEffect(() => {
        try {
            const flagString = Object.entries(flags)
                .filter(([_, v]) => v)
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
            .filter(([_, v]) => v)
            .map(([k]) => k)
            .join("");
        try {
            const regex = new RegExp(`(${pattern})`, flagString);
            return text.split(regex).map((part, i) =>
                part && new RegExp(`^${pattern}$`, flagString).test(part) ? (
                    <mark key={i} className="bg-yellow-200 text-black rounded px-0.5">{part}</mark>
                ) : (
                    part
                )
            );

        } catch {
            return text;
        }
    };

    return (
        <div className="max-w-2xl mx-auto my-6 p-4 border rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Regex Tester</h2>

            <div className="mb-4">
                <label className="block font-medium mb-1">Regex Pattern</label>
                <input
                    type="text"
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    placeholder="e.g. \d{3}-\d{2}-\d{4}"
                    className="w-full border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
            </div>

            <div className="flex gap-4 mb-4">
                {(["g", "i", "m"] as const).map((flag) => (
                    <label key={flag} className="flex items-center gap-1">
                        <input
                            type="checkbox"
                            checked={flags[flag]}
                            onChange={() => toggleFlag(flag)}
                            className="w-4 h-4"
                        />
                        {flag}
                    </label>
                ))}
            </div>

            <div className="mb-4">
                <label className="block font-medium mb-1">Text to Test</label>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={6}
                    className="w-full border rounded px-2 py-1 font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Paste your text here..."
                />
            </div>

            <div className="mb-4">
                <label className="block font-medium mb-1">Highlighted Matches</label>
                <div className="w-full border rounded p-2  min-h-[100px] break-words">
                    {highlightMatches()}
                </div>
            </div>

            <div>
                <label className="block font-medium mb-1">Match Results</label>
                <ul className="list-disc list-inside max-h-32 overflow-auto border rounded p-2 ">
                    {matches.length === 0 ? <li>No matches</li> : matches.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
            </div>
        </div>
    );
}
