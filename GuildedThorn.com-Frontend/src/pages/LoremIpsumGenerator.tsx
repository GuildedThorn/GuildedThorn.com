import { useState } from "react";
import { Input } from "@components/ui/Input";
import { Textarea } from "@components/ui/TextArea";
import { Button } from "@components/ui/Button";

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
            const text = [];
            for (let i = 0; i < amount; i++) {
                text.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
            }
            setOutput(text.join(" "));
        } else if (type === "sentences") {
            const text = [];
            for (let i = 0; i < amount; i++) {
                const sentence = [];
                const sentenceLength = 5 + Math.floor(Math.random() * 10);
                for (let j = 0; j < sentenceLength; j++) {
                    sentence.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
                }
                text.push(sentence.join(" ").replace(/^./, str => str.toUpperCase()) + ".");
            }
            setOutput(text.join(" "));
        } else if (type === "paragraphs") {
            const text = [];
            for (let i = 0; i < amount; i++) {
                const paragraph = [];
                const sentenceCount = 3 + Math.floor(Math.random() * 5);
                for (let j = 0; j < sentenceCount; j++) {
                    const sentenceLength = 5 + Math.floor(Math.random() * 10);
                    const sentence = [];
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
        <div className="panel p-6 text-left">
            <h2 className="mb-4 text-xl font-bold">Lorem Ipsum Generator</h2>

            <div className="mb-4 flex flex-wrap gap-2">
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value as "words" | "sentences" | "paragraphs")}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm
                        transition-colors focus-visible:border-ring focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                    <option value="words">Words</option>
                    <option value="sentences">Sentences</option>
                    <option value="paragraphs">Paragraphs</option>
                </select>
                <Input
                    type="number"
                    value={amount}
                    min={1}
                    onChange={(e) => setAmount(parseInt(e.target.value))}
                    className="w-24"
                />
                <Button onClick={generate} className="bg-success hover:bg-success/90">
                    Generate
                </Button>
                <Button onClick={copyToClipboard}>
                    Copy
                </Button>
            </div>

            <Textarea
                readOnly
                value={output}
                rows={10}
                className="font-mono"
            />
        </div>
    );
}
