import { useState } from "react";

export default function ColorConverter() {
    const [hex, setHex] = useState("#ffffff");
    const [rgb, setRgb] = useState("rgb(255, 255, 255)");
    const [color, setColor] = useState("#ffffff");

    const hexToRgb = (h: string) => {
        let hexClean = h.replace(/^#/, "");
        if (hexClean.length === 3) {
            hexClean = hexClean.split("").map(c => c + c).join("");
        }
        const bigint = parseInt(hexClean, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `rgb(${r}, ${g}, ${b})`;
    };

    const rgbToHex = (r: number, g: number, b: number) => {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    };

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setHex(value);
        try {
            const newRgb = hexToRgb(value);
            setRgb(newRgb);
            setColor(value.startsWith("#") ? value : "#" + value);
        } catch {
            setRgb("");
        }
    };

    const handleRgbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setRgb(value);
        const match = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
        if (match) {
            const [_, r, g, b] = match;
            const hexValue = rgbToHex(+r, +g, +b);
            setHex(hexValue);
            setColor(hexValue);
        }
    };

    const handleColorWheelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setHex(value);
        setColor(value);
        setRgb(hexToRgb(value));
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert(`Copied ${text} to clipboard!`);
    };

    return (
        <div className="max-w-md mx-auto my-6 p-4 border rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Color Converter</h2>

            <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <label className="w-16">HEX:</label>
                    <input
                        type="text"
                        value={hex}
                        onChange={handleHexChange}
                        placeholder="#FFFFFF"
                        className="flex-1 border rounded px-2 py-1 font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                        onClick={() => copyToClipboard(hex)}
                        className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    >
                        Copy
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <label className="w-16">RGB:</label>
                    <input
                        type="text"
                        value={rgb}
                        onChange={handleRgbChange}
                        placeholder="rgb(255,255,255)"
                        className="flex-1 border rounded px-2 py-1 font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                        onClick={() => copyToClipboard(rgb)}
                        className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    >
                        Copy
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <label className="w-16">Wheel:</label>
                    <input
                        type="color"
                        value={color}
                        onChange={handleColorWheelChange}
                        className="w-12 h-12 p-0 border-0 cursor-pointer"
                    />
                </div>
            </div>

            <div className="h-16 w-full rounded" style={{ backgroundColor: color }} />
        </div>
    );
}
