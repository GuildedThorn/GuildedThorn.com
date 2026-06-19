import { useEffect, useState } from "react";
import { FaSpotify } from "react-icons/fa";
import { cn } from "@lib/utils";

// Pulled straight from the stats.fm public API (CORS-open, no auth/Premium
// needed) instead of the Spotify Web API, which requires the app owner to have
// Spotify Premium.
const STATSFM_USER = "guildedthorn";
const MAX_ARTISTS = 10;

// stats.fm only supports these three windows.
const RANGES = [
    { value: "weeks", label: "4 Weeks" },
    { value: "months", label: "6 Months" },
    { value: "lifetime", label: "All Time" },
] as const;
type Range = (typeof RANGES)[number]["value"];

interface StatsFmArtistItem {
    position: number;
    streams: number | null;
    artist: {
        name: string;
        image?: string;
        genres: string[];
        spotifyPopularity?: number;
        externalIds?: { spotify?: string[] };
    };
}

function SpotifyTopArtists() {
    const [range, setRange] = useState<Range>("months");
    const [items, setItems] = useState<StatsFmArtistItem[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        const load = async () => {
            setLoading(true);
            setError("");
            try {
                const res = await fetch(
                    `https://api.stats.fm/api/v1/users/${STATSFM_USER}/top/artists?range=${range}&limit=${MAX_ARTISTS}`,
                    { signal: controller.signal },
                );
                if (!res.ok) throw new Error(`stats.fm responded ${res.status}`);
                const data = (await res.json()) as { items?: StatsFmArtistItem[] };
                setItems(data.items ?? []);
            } catch (err) {
                if ((err as Error).name === "AbortError") return;
                setError("Couldn’t load top artists from stats.fm right now.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        void load();
        return () => controller.abort();
    }, [range]);

    return (
        <div className="mt-4 text-left">
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <FaSpotify className="text-lg text-[#1DB954]" />
                <h2 className="text-xl font-bold">Top Artists</h2>

                <div className="ml-auto inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
                    {RANGES.map((r) => (
                        <button
                            key={r.value}
                            onClick={() => setRange(r.value)}
                            className={cn(
                                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                                range === r.value
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {error ? (
                <p className="text-sm text-muted-foreground">{error}</p>
            ) : loading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="tile flex items-center gap-3 p-3">
                            <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-muted-foreground/20" />
                            <div className="h-3 w-24 animate-pulse rounded bg-muted-foreground/20" />
                        </div>
                    ))}
                </div>
            ) : (
                <ol className="grid gap-3 sm:grid-cols-2">
                    {items.map((item, i) => {
                        const { artist } = item;
                        const spotifyId = artist.externalIds?.spotify?.[0];
                        const spotifyUrl = spotifyId
                            ? `https://open.spotify.com/artist/${spotifyId}`
                            : undefined;
                        const subtitle =
                            item.streams != null
                                ? `${item.streams.toLocaleString()} streams`
                                : artist.genres[0];

                        const inner = (
                            <>
                                <span className="eyebrow w-5 shrink-0 text-right tabular-nums">
                                    {item.position ?? i + 1}
                                </span>
                                {artist.image ? (
                                    <img
                                        src={artist.image}
                                        alt={artist.name}
                                        loading="lazy"
                                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="h-12 w-12 shrink-0 rounded-full bg-muted" />
                                )}
                                <div className="min-w-0">
                                    <p className="truncate font-semibold group-hover:text-primary">
                                        {artist.name}
                                    </p>
                                    {subtitle && <p className="eyebrow truncate">{subtitle}</p>}
                                </div>
                            </>
                        );

                        const cls =
                            "group tile flex items-center gap-3 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md";

                        return (
                            <li key={`${artist.name}-${i}`}>
                                {spotifyUrl ? (
                                    <a
                                        href={spotifyUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cls}
                                    >
                                        {inner}
                                    </a>
                                ) : (
                                    <div className={cls}>{inner}</div>
                                )}
                            </li>
                        );
                    })}
                </ol>
            )}
        </div>
    );
}

export default SpotifyTopArtists;
