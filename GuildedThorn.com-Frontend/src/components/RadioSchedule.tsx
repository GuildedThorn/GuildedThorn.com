import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Radio as RadioIcon, X } from "lucide-react";
import { Card } from "@components/ui/Card";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";
import { useAuth } from "@components/AuthContext";
import { cn } from "@lib/utils";
import {
    type StreamEvent,
    getStreamSchedule,
    createStreamEvent,
    deleteStreamEvent,
} from "@backend/api";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const formatLong = (key: string) =>
    new Date(`${key}T00:00:00`).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
    });
const shortDate = (key: string) =>
    new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function RadioSchedule() {
    const { user } = useAuth();
    const isOwner = user?.role === "owner";

    const today = new Date();
    const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

    const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
    const [events, setEvents] = useState<StreamEvent[]>([]);
    const [selected, setSelected] = useState<string | null>(todayKey);
    const [time, setTime] = useState("20:00");
    const [title, setTitle] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Hydrate the calendar from the database.
    useEffect(() => {
        let active = true;
        getStreamSchedule()
            .then((data) => {
                if (active) setEvents(data);
            })
            .catch((e) => {
                console.error("Failed to load radio schedule:", e);
                if (active) setError("Couldn't load the schedule.");
            });
        return () => {
            active = false;
        };
    }, []);

    const eventsByDate = useMemo(() => {
        const map = new Map<string, StreamEvent[]>();
        for (const e of events) {
            const arr = map.get(e.date) ?? [];
            arr.push(e);
            map.set(e.date, arr);
        }
        return map;
    }, [events]);

    const addEvent = async () => {
        if (!selected || !title.trim() || saving) return;
        setSaving(true);
        setError(null);
        try {
            const created = await createStreamEvent(selected, time, title.trim());
            setEvents((prev) => [...prev, created]);
            setTitle("");
        } catch (e) {
            console.error("Failed to add stream:", e);
            setError("Couldn't add the stream. Are you signed in as an owner?");
        } finally {
            setSaving(false);
        }
    };

    const removeEvent = async (id: string) => {
        const prev = events;
        setEvents((cur) => cur.filter((e) => e.id !== id)); // optimistic
        try {
            await deleteStreamEvent(id);
        } catch (e) {
            console.error("Failed to delete stream:", e);
            setEvents(prev); // roll back
            setError("Couldn't delete the stream.");
        }
    };

    const prevMonth = () =>
        setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }));
    const nextMonth = () =>
        setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }));

    const firstWeekday = new Date(view.year, view.month, 1).getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const cells: (number | null)[] = [
        ...Array<null>(firstWeekday).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    const selectedEvents = selected
        ? [...(eventsByDate.get(selected) ?? [])].sort((a, b) => a.time.localeCompare(b.time))
        : [];

    const upcoming = [...events]
        .filter((e) => e.date >= todayKey)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .slice(0, 6);

    return (
        <Card className="p-6 text-left">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <CalendarDays className="h-5 w-5 shrink-0 text-primary" />
                    <h2 className="truncate text-lg font-semibold">Stream Schedule</h2>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={prevMonth} aria-label="Previous month">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="w-28 text-center text-sm font-medium sm:w-36">
                        {MONTHS[view.month]} {view.year}
                    </span>
                    <Button variant="ghost" size="icon" onClick={nextMonth} aria-label="Next month">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Calendar grid */}
                <div className="min-w-0 lg:col-span-2">
                    <div className="grid grid-cols-7 gap-1">
                        {WEEKDAYS.map((d) => (
                            <div key={d} className="eyebrow py-1 text-center">
                                {d}
                            </div>
                        ))}
                        {cells.map((day, i) => {
                            if (day === null) return <div key={`blank-${i}`} />;
                            const key = toKey(view.year, view.month, day);
                            const count = eventsByDate.get(key)?.length ?? 0;
                            const isToday = key === todayKey;
                            const isSelected = key === selected;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setSelected(key)}
                                    className={cn(
                                        "relative flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors",
                                        isSelected
                                            ? "border-primary bg-primary/10 font-semibold text-primary"
                                            : isToday
                                              ? "border-primary/40"
                                              : "border-transparent hover:bg-muted",
                                    )}
                                >
                                    {day}
                                    {count > 0 && (
                                        <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-primary" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Side panel: day editor + upcoming */}
                <div className="min-w-0 space-y-5">
                    {selected && (
                        <div className="tile p-4">
                            <p className="eyebrow">{formatLong(selected)}</p>

                            <ul className="mt-3 space-y-2">
                                {selectedEvents.length === 0 && (
                                    <li className="text-sm text-muted-foreground">No streams scheduled.</li>
                                )}
                                {selectedEvents.map((ev) => (
                                    <li
                                        key={ev.id}
                                        className="flex items-center justify-between gap-2 rounded-lg bg-background/60 px-3 py-2"
                                    >
                                        <span className="min-w-0 flex-1 truncate text-sm">
                                            <span className="font-mono text-xs text-muted-foreground">{ev.time}</span>{" "}
                                            · {ev.title}
                                        </span>
                                        {isOwner && (
                                            <button
                                                onClick={() => removeEvent(ev.id)}
                                                aria-label="Remove stream"
                                                className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>

                            {isOwner && (
                                <div className="mt-3 space-y-2">
                                    <div className="flex gap-2">
                                        <Input
                                            type="time"
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            className="w-28 shrink-0 sm:w-32"
                                        />
                                        <Input
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Stream title"
                                            className="min-w-0 flex-1"
                                        />
                                    </div>
                                    <Button size="sm" onClick={addEvent} disabled={!title.trim() || saving}>
                                        <Plus className="h-4 w-4" />
                                        {saving ? "Adding…" : "Add stream"}
                                    </Button>
                                    {error && <p className="text-xs text-destructive">{error}</p>}
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <p className="eyebrow mb-2">Upcoming</p>
                        {upcoming.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
                        ) : (
                            <ul className="space-y-1.5">
                                {upcoming.map((ev) => (
                                    <li key={ev.id} className="flex items-center gap-2 text-sm">
                                        <RadioIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                            {shortDate(ev.date)} {ev.time}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">{ev.title}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
