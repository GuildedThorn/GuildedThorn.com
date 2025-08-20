import { useState } from "react";

// Simple Lorem Ipsum words
const LOREM_WORDS = [
    "lorem","ipsum","dolor","sit","amet","consectetur","adipiscing","elit",
    "sed","do","eiusmod","tempor","incididunt","ut","labore","et","dolore",
    "magna","aliqua","ut","enim","ad","minim","veniam"
];

export default function LoremIpsumGenerator() {
    const [type, setType] = useState<"words"|"sentences"|"paragraphs">("words");
    const [amount, setAmount] = useState(10);
    const [output, setOutput] = useState("");

    const generate = () => {
        if (type === "words") {
            let text = [];
            for (let i = 0; i < amount; i++) {
                text.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
            }
            setOutput(text.join(" "));
        } else if (type === "sentences") {
            let text = [];
            for (let i = 0; i < amount; i++) {
                let sentence = [];
                let sentenceLength = 5 + Math.floor(Math.random() * 10);
                for (let j = 0; j < sentenceLength; j++) {
                    sentence.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
                }
                text.push(sentence.join(" ").replace(/^./, str => str.toUpperCase()) + ".");
            }
            setOutput(text.join(" "));
        } else if (type === "paragraphs") {
            let text = [];
            for (let i = 0; i < amount; i++) {
                let paragraph = [];
                let sentenceCount = 3 + Math.floor(Math.random() * 5);
                for (let j = 0; j < sentenceCount; j++) {
                    let sentenceLength = 5 + Math.floor(Math.random() * 10);
                    let sentence = [];
                    for (let k = 0; k < sentenceLength; k++) {
                        sentence.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
                    }
                    paragraph.push(sentence.join(" ").replace(/^./, str => str.toUpperCase()) + ".");
                }
                text.push(paragraph.join(" "));
            }
            setOutput(text.join("\n\n"));
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(output);
        alert("Text copied to clipboard!");
    };

    return (
        <div className="max-w-2xl mx-auto my-6 p-4 border rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Lorem Ipsum Generator</h2>

            <div className="flex gap-2 mb-4">
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="border rounded px-2 py-1"
                >
                    <option value="words">Words</option>
                    <option value="sentences">Sentences</option>
                    <option value="paragraphs">Paragraphs</option>
                </select>
                <input
                    type="number"
                    value={amount}
                    min={1}
                    onChange={(e) => setAmount(parseInt(e.target.value))}
                    className="border rounded px-2 py-1 w-24"
                />
                <button
                    onClick={generate}
                    className="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition"
                >
                    Generate
                </button>
                <button
                    onClick={copyToClipboard}
                    className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                >
                    Copy
                </button>
            </div>

            <textarea
                readOnly
                value={output}
                rows={10}
                className="w-full border rounded px-2 py-1 font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
        </div>
    );
}
