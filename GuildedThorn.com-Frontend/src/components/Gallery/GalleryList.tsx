import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
    Search,
    X,
    ImageOff,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Info,
} from "lucide-react";
import { Button } from "@components/ui/Button";
import { useAuth } from "@components/AuthContext";
import { cn } from "@lib/utils";

// Pull a generous batch so the whole (filtered) gallery lives on one
// scroll-snap strip — no pagination to interrupt the swipe.
const FETCH_SIZE = 100;

// Chromium renders the carousel's prev/next buttons and dots natively from CSS
// (::scroll-button / ::scroll-marker). Firefox/Safari don't yet, so we detect
// support and fall back to React-driven controls that scroll the same strip.
const supportsCssCarousel = () =>
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("scroll-marker-group", "after");

type TagState = Record<string, "in" | "out">;

interface GalleryImage {
    id: string;
    title: string;
    description?: string;
    fileType: string;
    tags?: string[];
    metaData?: Record<string, string>;
    createdAt?: string;
}

export default function GalleryList() {
    // /gallery/images/:id deep-links straight into the carousel at that photo.
    const { id } = useParams<{ id?: string }>();
    const { user } = useAuth();
    const isOwner = user?.role === "owner";

    const [images, setImages] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");
    const [allTags, setAllTags] = useState<string[]>([]);
    const [tagState, setTagState] = useState<TagState>({});

    // Which photo the carousel is focused on (null = default browse / show grid
    // while searching). Picking a grid result sets this and opens the carousel.
    const [selected, setSelected] = useState<string | null>(id ?? null);
    // Which slide's metadata panel is open.
    const [infoOpenId, setInfoOpenId] = useState<string | null>(null);

    const listRef = useRef<HTMLUListElement>(null);

    // Native (Chromium) carousel controls vs. our JS fallback (everyone else).
    const nativeControls = useMemo(supportsCssCarousel, []);
    const [active, setActive] = useState(0);

    // Search results show as a scannable grid; everything else is the carousel.
    const showGrid = query.trim().length > 0 && selected === null;

    const included = Object.keys(tagState).filter((t) => tagState[t] === "in").sort();
    const excluded = Object.keys(tagState).filter((t) => tagState[t] === "out").sort();
    const tagsParam = included.join(",");
    const notTagsParam = excluded.join(",");
    const hasTagFilters = included.length > 0 || excluded.length > 0;

    useEffect(() => {
        fetch("/api/gallery/getTags", { credentials: "include" })
            .then((res) => res.json())
            .then((data) => setAllTags(Array.isArray(data) ? data : []))
            .catch(console.error);
    }, []);

    const cycleTag = (tag: string) => {
        setTagState((prev) => {
            const next = { ...prev };
            if (!next[tag]) next[tag] = "in";
            else if (next[tag] === "in") next[tag] = "out";
            else delete next[tag];
            return next;
        });
    };

    // Debounce the search box
    useEffect(() => {
        const t = setTimeout(() => setQuery(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams({ page: "1", pageSize: String(FETCH_SIZE) });
        if (query) params.set("search", query);
        if (tagsParam) params.set("tags", tagsParam);
        if (notTagsParam) params.set("notTags", notTagsParam);
        fetch(`/api/gallery/getImages?${params.toString()}`, { credentials: "include" })
            .then((res) => res.json())
            .then((data) => setImages(data.items ?? []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [query, tagsParam, notTagsParam]);

    // When the carousel is focused on a specific photo (deep-link or grid pick),
    // jump to it once it's in the DOM.
    useEffect(() => {
        if (showGrid || !selected) return;
        const el = listRef.current?.querySelector<HTMLElement>(`[data-id="${selected}"]`);
        el?.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
    }, [selected, showGrid, images]);

    // JS fallback only: keep `active` synced to scroll position so the dots
    // highlight and arrows disable at the ends. (Chromium tracks this itself.)
    useEffect(() => {
        const el = listRef.current;
        if (nativeControls || showGrid || !el) return;
        let raf = 0;
        const onScroll = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                if (el.clientWidth > 0) setActive(Math.round(el.scrollLeft / el.clientWidth));
            });
        };
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            el.removeEventListener("scroll", onScroll);
            cancelAnimationFrame(raf);
        };
    }, [nativeControls, showGrid, images.length]);

    const scrollToIndex = (i: number) => {
        const el = listRef.current;
        if (!el) return;
        const clamped = Math.max(0, Math.min(images.length - 1, i));
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollTo({ left: clamped * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
    };

    const onSearchChange = (value: string) => {
        setSearch(value);
        setSelected(null); // typing returns to the results grid
    };

    const handleDelete = async (img: GalleryImage) => {
        if (!window.confirm(`Delete “${img.title}”? This can't be undone.`)) return;
        try {
            const res = await fetch(`/api/gallery/${img.id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error((await res.text()) || "Delete failed");
            setImages((prev) => prev.filter((i) => i.id !== img.id));
        } catch (err) {
            window.alert((err as Error).message);
        }
    };

    return (
        <div className="space-y-5 text-left">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">Gallery</h2>

                <div className="relative w-full max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search images…"
                        className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-10 text-sm
                            shadow-sm transition-colors placeholder:text-muted-foreground
                            focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => onSearchChange("")}
                            aria-label="Clear search"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground
                                transition-colors hover:bg-accent hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Tag filter — click to include, again to exclude, again to clear */}
            {allTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    {allTags.map((tag) => {
                        const state = tagState[tag];
                        return (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => cycleTag(tag)}
                                className={cn(
                                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                                    state === "in"
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : state === "out"
                                          ? "border-destructive bg-destructive/10 text-destructive line-through"
                                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                                )}
                            >
                                {tag}
                            </button>
                        );
                    })}
                    {hasTagFilters && (
                        <button
                            type="button"
                            onClick={() => setTagState({})}
                            className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                        >
                            Clear tags
                        </button>
                    )}
                </div>
            )}

            {/* Coming from a search result back into the carousel: offer a way back. */}
            {!showGrid && query.trim().length > 0 && (
                <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground
                        transition-colors hover:text-primary"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to results
                </button>
            )}

            {images.length === 0 ? (
                <div className="panel border-dashed bg-card/40 px-6 py-16 text-center shadow-none">
                    <ImageOff className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">
                        {loading ? "Loading…" : "No images match your filters."}
                    </p>
                </div>
            ) : showGrid ? (
                /* ── Search results: thumbnail grid ─────────────────────────── */
                <ul
                    className={cn(
                        "grid grid-cols-2 gap-4 transition-opacity md:grid-cols-3 lg:grid-cols-4",
                        loading ? "opacity-60" : "opacity-100",
                    )}
                >
                    {images.map((img) => (
                        <li key={img.id} className="group">
                            <button
                                type="button"
                                onClick={() => setSelected(img.id)}
                                className="block w-full text-left"
                            >
                                <div className="overflow-hidden rounded-xl border border-border shadow-sm transition-shadow group-hover:shadow-md">
                                    <img
                                        src={`/images/gallery/${img.id}.${img.fileType}`}
                                        alt={img.title}
                                        loading="lazy"
                                        className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                </div>
                                <p className="mt-2 text-center text-sm font-medium transition-colors group-hover:text-primary">
                                    {img.title}
                                </p>
                                {img.tags && img.tags.length > 0 && (
                                    <div className="mt-1 flex flex-wrap justify-center gap-1">
                                        {img.tags.slice(0, 3).map((tag) => (
                                            <span
                                                key={tag}
                                                className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                /* ── Carousel ───────────────────────────────────────────────── */
                <div className="relative">
                    <ul
                        ref={listRef}
                        className={cn(
                            "photo-carousel rounded-2xl border border-border bg-card/30 transition-opacity",
                            loading ? "opacity-60" : "opacity-100",
                        )}
                    >
                        {images.map((img) => {
                            const hasMeta = !!img.metaData && Object.keys(img.metaData).length > 0;
                            const infoOpen = infoOpenId === img.id;
                            return (
                                <li
                                    key={img.id}
                                    data-id={img.id}
                                    data-accname={img.title}
                                    className="relative flex h-full items-center justify-center p-3 sm:p-4"
                                >
                                    <img
                                        src={`/images/gallery/${img.id}.${img.fileType}`}
                                        alt={img.title}
                                        loading="lazy"
                                        decoding="async"
                                        className="max-h-full max-w-full rounded-xl object-contain shadow-lg"
                                    />

                                    {/* Caption — non-interactive so it never blocks swiping. */}
                                    <figcaption
                                        className="pointer-events-none absolute inset-x-3 bottom-3 rounded-b-xl
                                            bg-gradient-to-t from-black/75 via-black/35 to-transparent
                                            px-5 pb-14 pt-10 text-white sm:inset-x-4 sm:bottom-4"
                                    >
                                        <h3 className="text-lg font-semibold drop-shadow">{img.title}</h3>
                                        {img.description && (
                                            <p className="mt-1 line-clamp-2 text-sm text-white/85 drop-shadow">
                                                {img.description}
                                            </p>
                                        )}
                                        {img.tags && img.tags.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {img.tags.slice(0, 5).map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium backdrop-blur"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </figcaption>

                                    {/* Info toggle — opens the metadata panel. */}
                                    {(hasMeta || img.description || img.createdAt) && (
                                        <button
                                            type="button"
                                            onClick={() => setInfoOpenId(infoOpen ? null : img.id)}
                                            aria-label={infoOpen ? "Hide photo info" : "Show photo info"}
                                            aria-expanded={infoOpen}
                                            className="absolute left-4 top-4 z-30 flex h-9 w-9 items-center justify-center
                                                rounded-full border border-border bg-background/80 text-foreground shadow-md
                                                backdrop-blur transition-colors hover:bg-muted hover:text-primary
                                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <Info className="h-4 w-4" />
                                        </button>
                                    )}

                                    {/* Metadata panel. */}
                                    {infoOpen && (
                                        <div className="absolute inset-3 z-40 overflow-y-auto rounded-xl border border-border
                                            bg-background/95 p-5 text-foreground shadow-xl backdrop-blur sm:inset-4">
                                            <div className="mb-3 flex items-start justify-between gap-3">
                                                <h3 className="text-lg font-semibold">{img.title}</h3>
                                                <button
                                                    type="button"
                                                    onClick={() => setInfoOpenId(null)}
                                                    aria-label="Close info"
                                                    className="rounded-md p-1.5 text-muted-foreground transition-colors
                                                        hover:bg-accent hover:text-foreground"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>

                                            {img.description && (
                                                <p className="mb-4 text-sm text-muted-foreground">{img.description}</p>
                                            )}

                                            {img.tags && img.tags.length > 0 && (
                                                <div className="mb-4 flex flex-wrap gap-1.5">
                                                    {img.tags.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {hasMeta && (
                                                <dl className="grid gap-3 sm:grid-cols-2">
                                                    {Object.entries(img.metaData!).map(([key, value]) => (
                                                        <div key={key} className="rounded-lg bg-muted/60 p-3">
                                                            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                                                {key}
                                                            </dt>
                                                            <dd className="mt-0.5 break-words text-sm font-medium">
                                                                {value}
                                                            </dd>
                                                        </div>
                                                    ))}
                                                </dl>
                                            )}

                                            {img.createdAt && (
                                                <p className="mt-4 text-xs text-muted-foreground">
                                                    Uploaded: {new Date(img.createdAt).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {isOwner && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDelete(img)}
                                            className="absolute right-4 top-4 z-30 shadow-md"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </Button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>

                    {/* Fallback controls for browsers without CSS carousel support
                        (Firefox/Safari). Chromium gets the native ::scroll-button /
                        ::scroll-marker controls and skips these. */}
                    {!nativeControls && images.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={() => scrollToIndex(active - 1)}
                                disabled={active <= 0}
                                aria-label="Previous photo"
                                className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center
                                    justify-center rounded-full border border-border bg-background/80 text-foreground
                                    shadow-md backdrop-blur transition-colors hover:bg-muted hover:text-primary
                                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                                    disabled:pointer-events-none disabled:opacity-25"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToIndex(active + 1)}
                                disabled={active >= images.length - 1}
                                aria-label="Next photo"
                                className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center
                                    justify-center rounded-full border border-border bg-background/80 text-foreground
                                    shadow-md backdrop-blur transition-colors hover:bg-muted hover:text-primary
                                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                                    disabled:pointer-events-none disabled:opacity-25"
                            >
                                <ChevronRight className="h-6 w-6" />
                            </button>

                            {/* Dots for small sets; a compact counter once there are too many. */}
                            {images.length <= 12 ? (
                                <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-full
                                    bg-background/60 px-3 py-2 backdrop-blur">
                                    {images.map((img, i) => (
                                        <button
                                            key={img.id}
                                            type="button"
                                            onClick={() => scrollToIndex(i)}
                                            aria-label={`Go to ${img.title}`}
                                            aria-current={i === active}
                                            className={cn(
                                                "h-2.5 w-2.5 rounded-full transition-all",
                                                i === active
                                                    ? "scale-125 bg-primary"
                                                    : "bg-foreground/35 hover:bg-foreground/60",
                                            )}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full
                                    bg-background/70 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
                                    {active + 1} / {images.length}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
