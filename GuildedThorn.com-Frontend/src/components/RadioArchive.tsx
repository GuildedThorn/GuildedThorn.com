import { useEffect, useState } from "react";
import { Archive, Pause, Play } from "lucide-react";
import { Card } from "@components/ui/Card";
import { Button } from "@components/ui/Button";
import { cn } from "@lib/utils";
import { getRadioRecordings, type RadioRecording } from "@backend/api";
import { formatArchiveSubtitle, useRadioPlayer } from "@components/RadioPlayerContext";

// Browse and replay past broadcasts through the same player widget (and single
// <audio> element) the live stream uses — see RadioPlayerContext.playArchive.
export default function RadioArchive() {
    const { mode, archive, playing, playArchive, toggle } = useRadioPlayer();

    const pageSize = 10;
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [recordings, setRecordings] = useState<RadioRecording[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const ctrl = new AbortController();
        setLoading(true);
        setError(null);

        getRadioRecordings(page, pageSize)
            .then((data) => {
                if (ctrl.signal.aborted) return;
                setRecordings(data.items);
                setTotalPages(data.totalPages);
            })
            .catch((e) => {
                if (ctrl.signal.aborted) return;
                console.error("Failed to load radio archive:", e);
                setError("Couldn't load past broadcasts.");
            })
            .finally(() => {
                if (!ctrl.signal.aborted) setLoading(false);
            });

        return () => ctrl.abort();
    }, [page]);

    const isActive = (recording: RadioRecording) => mode === "archive" && archive?.id === recording.id;

    return (
        <Card className="p-6 text-left">
            <div className="mb-4 flex items-center gap-2">
                <Archive className="h-5 w-5 shrink-0 text-primary" />
                <h2 className="text-lg font-semibold">Past Broadcasts</h2>
            </div>

            {loading && recordings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
            ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
            ) : recordings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No past broadcasts recorded yet.</p>
            ) : (
                <ul className="space-y-1.5">
                    {recordings.map((recording) => {
                        const active = isActive(recording);
                        return (
                            <li
                                key={recording.id}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                                    active ? "bg-primary/10" : "hover:bg-muted",
                                )}
                            >
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 rounded-full"
                                    aria-label={active && playing ? "Pause" : "Play"}
                                    onClick={() => (active ? toggle() : playArchive(recording))}
                                >
                                    {active && playing ? <Pause size={14} /> : <Play size={14} />}
                                </Button>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                        {recording.stationName || "GuildedThorn Radio"}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {formatArchiveSubtitle(recording)}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1 || loading}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        ← Previous
                    </Button>

                    <span className="text-sm tabular-nums text-muted-foreground">
                        Page {page} of {totalPages}
                    </span>

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === totalPages || loading}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next →
                    </Button>
                </div>
            )}
        </Card>
    );
}
