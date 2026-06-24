import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";

type Mode = "text" | "wifi" | "vcard";

// Escape the special characters in the Wi-Fi QR format (\ ; , : ").
const esc = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");

export default function QrCodeGenerator() {
    const [mode, setMode] = useState<Mode>("text");
    const [text, setText] = useState("https://guildedthorn.com");
    const [wifi, setWifi] = useState({ ssid: "", pass: "", enc: "WPA", hidden: false });
    const [vc, setVc] = useState({ name: "", org: "", phone: "", email: "" });
    const wrap = useRef<HTMLDivElement>(null);

    let value = "";
    if (mode === "text") {
        value = text;
    } else if (mode === "wifi") {
        value = wifi.ssid
            ? `WIFI:T:${wifi.enc};S:${esc(wifi.ssid)};${wifi.enc === "nopass" ? "" : `P:${esc(wifi.pass)};`}${wifi.hidden ? "H:true;" : ""};`
            : "";
    } else {
        value = vc.name || vc.phone || vc.email
            ? `BEGIN:VCARD\nVERSION:3.0\nFN:${vc.name}\n${vc.org ? `ORG:${vc.org}\n` : ""}${vc.phone ? `TEL:${vc.phone}\n` : ""}${vc.email ? `EMAIL:${vc.email}\n` : ""}END:VCARD`
            : "";
    }

    const download = () => {
        const canvas = wrap.current?.querySelector("canvas");
        if (!canvas) return;
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = "qr-code.png";
        a.click();
    };

    const field = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

    return (
        <div className="panel h-full p-6 text-left">
            <h2 className="mb-4 text-xl font-bold">QR Code Generator</h2>

            <div className="mb-4 flex gap-1 rounded-lg border border-border p-1">
                {(["text", "wifi", "vcard"] as Mode[]).map((m) => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium capitalize transition-colors ${
                            mode === m ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                    >
                        {m === "vcard" ? "Contact" : m === "wifi" ? "Wi-Fi" : "Text/URL"}
                    </button>
                ))}
            </div>

            <div className="grid items-start gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    {mode === "text" && (
                        <Input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="https://… or any text"
                        />
                    )}

                    {mode === "wifi" && (
                        <>
                            <Input placeholder="Network name (SSID)" value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} />
                            {wifi.enc !== "nopass" && (
                                <Input placeholder="Password" value={wifi.pass} onChange={(e) => setWifi({ ...wifi, pass: e.target.value })} />
                            )}
                            <select className={field} value={wifi.enc} onChange={(e) => setWifi({ ...wifi, enc: e.target.value })}>
                                <option value="WPA">WPA/WPA2</option>
                                <option value="WEP">WEP</option>
                                <option value="nopass">No password</option>
                            </select>
                            <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                <input type="checkbox" checked={wifi.hidden} onChange={(e) => setWifi({ ...wifi, hidden: e.target.checked })} />
                                Hidden network
                            </label>
                        </>
                    )}

                    {mode === "vcard" && (
                        <>
                            <Input placeholder="Full name" value={vc.name} onChange={(e) => setVc({ ...vc, name: e.target.value })} />
                            <Input placeholder="Organisation" value={vc.org} onChange={(e) => setVc({ ...vc, org: e.target.value })} />
                            <Input placeholder="Phone" value={vc.phone} onChange={(e) => setVc({ ...vc, phone: e.target.value })} />
                            <Input placeholder="Email" value={vc.email} onChange={(e) => setVc({ ...vc, email: e.target.value })} />
                        </>
                    )}
                </div>

                <div className="flex flex-col items-center gap-3" ref={wrap}>
                    {value ? (
                        <>
                            <div className="rounded-lg bg-white p-3">
                                <QRCodeCanvas value={value} size={160} level="M" marginSize={0} />
                            </div>
                            <Button size="sm" variant="outline" onClick={download} className="w-full">
                                Download PNG
                            </Button>
                        </>
                    ) : (
                        <div className="flex aspect-square w-full max-w-[186px] items-center justify-center rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                            Fill in the fields to generate a code
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
