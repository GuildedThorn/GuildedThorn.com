import { useState } from "react";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";

export default function UUIDGenerator() {
    const [uuid, setUuid] = useState("");

    const generateUUID = () => {
        // Generate a random v4 UUID
        const newUuid = crypto.randomUUID();
        setUuid(newUuid);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(uuid);
        alert("UUID copied to clipboard!");
    };

    return (
        <div className="panel h-full p-6 text-left">
            <h2 className="mb-4 text-xl font-bold">UUID Generator</h2>

            <div className="mb-4 flex items-center gap-2">
                <Input
                    type="text"
                    value={uuid}
                    readOnly
                    className="flex-1 font-mono"
                    placeholder="Generated UUID will appear here"
                />
                <Button size="sm" onClick={copyToClipboard}>
                    Copy
                </Button>
            </div>

            <Button onClick={generateUUID} className="w-full bg-success hover:bg-success/90">
                Generate UUID
            </Button>
        </div>
    );
}
