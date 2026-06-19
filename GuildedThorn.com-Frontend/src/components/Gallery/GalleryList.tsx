import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X, ImageOff } from "lucide-react";
import { Button } from "@components/ui/Button";
import { cn } from "@lib/utils";

const PAGE_SIZE = 12;

type TagState = Record<string, "in" | "out">;

interface GalleryImage {
    id: string;
    title: string;
    fileType: string;
    tags?: string[];
}

export default function GalleryList() {
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");
    const [allTags, setAllTags] = useState<string[]>([]);
    const [tagState, setTagState] = useState<TagState>({});

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
        setPage(1);
    };

    // Debounce the search box
    useEffect(() => {
        const id = setTimeout(() => {
            setQuery(search.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(id);
    }, [search]);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
        if (query) params.set("search", query);
        if (tagsParam) params.set("tags", tagsParam);
        if (notTagsParam) params.set("notTags", notTagsParam);
        fetch(`/api/gallery/getImages?${params.toString()}`, { credentials: "include" })
            .then((res) => res.json())
            .then((data) => {
                setImages(data.items ?? []);
                setTotalPages(Math.max(1, data.totalPages ?? 1));
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [page, query, tagsParam, notTagsParam]);

    return (
        <div className="space-y-6 text-left">
            <h2 className="text-2xl font-semibold">Gallery</h2>

            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search images…"
                    className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-10 text-sm
                        shadow-sm transition-colors placeholder:text-muted-foreground
                        focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch("")}
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground
                            transition-colors hover:bg-accent hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
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
                            onClick={() => {
                                setTagState({});
                                setPage(1);
                            }}
                            className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                        >
                            Clear tags
                        </button>
                    )}
                </div>
            )}

            {images.length === 0 ? (
                <div className="panel border-dashed bg-card/40 px-6 py-16 text-center shadow-none">
                    <ImageOff className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">
                        {loading ? "Loading…" : "No images match your filters."}
                    </p>
                </div>
            ) : (
                <ul
                    className={cn(
                        "grid grid-cols-2 gap-4 transition-opacity md:grid-cols-3 lg:grid-cols-4",
                        loading ? "opacity-60" : "opacity-100",
                    )}
                >
                    {images.map((img) => (
                        <li key={img.id} className="group">
                            <Link to={`/gallery/images/${img.id}`} className="block">
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
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <Button
                        variant="outline"
                        disabled={page === 1 || loading}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        ← Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        disabled={page === totalPages || loading}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next →
                    </Button>
                </div>
            )}
        </div>
    );
}
