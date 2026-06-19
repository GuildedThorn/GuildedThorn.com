import { useState } from "react";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";

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
            const [, r, g, b] = match;
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
        <div className="panel h-full p-6 text-left">
            <h2 className="mb-4 text-xl font-bold">Color Converter</h2>

            <div className="mb-4 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <label htmlFor="hex" className="w-16 text-sm font-medium">HEX:</label>
                    <Input
                        id="hex"
                        type="text"
                        value={hex}
                        onChange={handleHexChange}
                        placeholder="#FFFFFF"
                        className="flex-1 font-mono"
                    />
                    <Button size="sm" onClick={() => copyToClipboard(hex)}>
                        Copy
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <label htmlFor="rgb" className="w-16 text-sm font-medium">RGB:</label>
                    <Input
                        id="rgb"
                        type="text"
                        value={rgb}
                        onChange={handleRgbChange}
                        placeholder="rgb(255,255,255)"
                        className="flex-1 font-mono"
                    />
                    <Button size="sm" onClick={() => copyToClipboard(rgb)}>
                        Copy
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <label htmlFor="wheel" className="w-16 text-sm font-medium">Wheel:</label>
                    <input
                        id="wheel"
                        type="color"
                        value={color}
                        onChange={handleColorWheelChange}
                        className="h-12 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-0"
                    />
                </div>
            </div>

            <div
                className="h-16 w-full rounded-xl border border-border"
                style={{ backgroundColor: color }}
            />
        </div>
    );
}
