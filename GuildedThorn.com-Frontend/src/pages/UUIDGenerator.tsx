import { useState } from "react";

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
        <div className="max-w-md mx-auto my-6 p-4 border rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">UUID Generator</h2>

            <div className="mb-4 flex items-center gap-2">
                <input
                    type="text"
                    value={uuid}
                    readOnly
                    className="flex-1 border rounded px-2 py-1 font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Generated UUID will appear here"
                />
                <button
                    onClick={copyToClipboard}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                >
                    Copy
                </button>
            </div>

            <button
                onClick={generateUUID}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
            >
                Generate UUID
            </button>
        </div>
    );
}
