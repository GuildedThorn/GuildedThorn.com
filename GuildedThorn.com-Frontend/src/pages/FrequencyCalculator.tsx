import { useState } from "react";
import { Input } from "@components/ui/Input";

// Antenna & RF bench helpers. Wavelength λ = c / f. A real antenna is a touch
// shorter than the ideal because the signal travels slower in the wire — that's
// the velocity factor (≈0.95 for thin wire). Plus a dBm ↔ mW converter.
const C = 299792458; // speed of light, m/s
const UNITS: Record<string, number> = { Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9 };

function len(m: number) {
    if (!Number.isFinite(m) || m <= 0) return "—";
    if (m >= 1) return `${m.toFixed(3)} m`;
    if (m >= 0.01) return `${(m * 100).toFixed(2)} cm`;
    return `${(m * 1000).toFixed(2)} mm`;
}

export default function FrequencyCalculator() {
    const [freq, setFreq] = useState("145");
    const [unit, setUnit] = useState("MHz");
    const [vf, setVf] = useState("0.95");

    const hz = (parseFloat(freq) || 0) * UNITS[unit];
    const v = parseFloat(vf) || 0;
    const lambda = hz > 0 ? C / hz : NaN;

    const [dbm, setDbm] = useState("30");
    const [mw, setMw] = useState("100");
    const mwFromDbm = 10 ** ((parseFloat(dbm) || 0) / 10);
    const dbmFromMw = parseFloat(mw) > 0 ? 10 * Math.log10(parseFloat(mw)) : NaN;

    return (
        <div className="panel h-full p-6 text-left">
            <h2 className="mb-4 text-xl font-bold">Antenna &amp; RF</h2>

            <div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
                <div>
                    <label htmlFor="rf-freq" className="field-label">Frequency</label>
                    <Input
                        id="rf-freq"
                        type="number"
                        min="0"
                        value={freq}
                        onChange={(e) => setFreq(e.target.value)}
                        className="font-mono"
                    />
                </div>
                <div>
                    <label htmlFor="rf-unit" className="field-label">Unit</label>
                    <select
                        id="rf-unit"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="h-10 rounded-lg border border-border bg-background px-2 text-sm"
                    >
                        {Object.keys(UNITS).map((u) => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>
                </div>
            </div>

            <label htmlFor="rf-vf" className="field-label">Velocity factor</label>
            <Input
                id="rf-vf"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={vf}
                onChange={(e) => setVf(e.target.value)}
                className="mb-4 font-mono"
            />

            <dl className="space-y-1.5 text-sm tabular-nums">
                <Row label="Wavelength (λ)" value={len(lambda)} />
                <Row label="Full-wave" value={len(lambda * v)} />
                <Row label="½-wave dipole" value={len((lambda / 2) * v)} />
                <Row label="¼-wave" value={len((lambda / 4) * v)} />
            </dl>

            <hr className="my-4 border-border" />

            <p className="field-label">Power: dBm ↔ mW</p>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="rf-dbm" className="mb-1 block text-xs text-muted-foreground">dBm →</label>
                    <Input id="rf-dbm" type="number" value={dbm} onChange={(e) => setDbm(e.target.value)} className="font-mono" />
                    <p className="mt-1 text-sm tabular-nums">{Number.isFinite(mwFromDbm) ? `${mwFromDbm.toPrecision(4)} mW` : "—"}</p>
                </div>
                <div>
                    <label htmlFor="rf-mw" className="mb-1 block text-xs text-muted-foreground">mW →</label>
                    <Input id="rf-mw" type="number" value={mw} onChange={(e) => setMw(e.target.value)} className="font-mono" />
                    <p className="mt-1 text-sm tabular-nums">{Number.isFinite(dbmFromMw) ? `${dbmFromMw.toFixed(2)} dBm` : "—"}</p>
                </div>
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
        </div>
    );
}
