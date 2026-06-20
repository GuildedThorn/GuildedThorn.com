import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X, Clock, FileText } from "lucide-react";
import { Button } from "@components/ui/Button";
import { cn } from "@lib/utils";
import { stripFrontmatter } from "@lib/frontmatter";

const PAGE_SIZE = 8;

type TagState = Record<string, "in" | "out">;

interface BlogPost {
    id: string;  // ObjectId string, not number
    title: string;
    content?: string;
    createdAt?: string;
    tags?: string[];
}

// Rough markdown -> plain text for excerpts
function excerpt(md: string | undefined, max = 180): string {
    if (!md) return "";
    const text = stripFrontmatter(md)
        .replace(/```[\s\S]*?```/g, " ")          // code blocks
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")    // images
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")  // links -> label
        .replace(/[#>*`~_|-]+/g, " ")             // md punctuation
        .replace(/\s+/g, " ")
        .trim();
    return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

function readMinutes(md: string | undefined): number {
    if (!md) return 1;
    const words = md.trim() === "" ? 0 : md.trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 200));
}

export default function BlogList() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
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

    // Available tags for the filter bar
    useEffect(() => {
        fetch("/api/blog/getTags")
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

    // Debounce the search box, resetting to the first page on a new query
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
        fetch(`/api/blog/getPosts?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                setPosts(data.items ?? []);
                setTotalPages(Math.max(1, data.totalPages ?? 1));
                setTotal(data.total ?? data.items?.length ?? 0);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [page, query, tagsParam, notTagsParam]);

    return (
        <div className="w-full space-y-6 py-2 text-left">
            {/* Header + search */}
            <div className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <h2 className="text-2xl font-semibold">Recent Posts</h2>
                    <span className="text-sm text-muted-foreground">
                        {query
                            ? `${total} result${total !== 1 ? "s" : ""} for “${query}”`
                            : `${total} post${total !== 1 ? "s" : ""}`}
                    </span>
                </div>

                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search posts…"
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
            </div>

            {/* Rows */}
            {posts.length === 0 ? (
                <div className="panel border-dashed bg-card/40 px-6 py-16 text-center shadow-none">
                    <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">
                        {loading ? "Loading…" : query ? `No posts match “${query}”.` : "No posts yet."}
                    </p>
                </div>
            ) : (
                <ul className={`space-y-3 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
                    {posts.map((post) => (
                        <li key={post.id}>
                            <Link
                                to={`/blog/pages/${post.id}`}
                                viewTransition
                                className="group block panel p-5
                                    transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md sm:p-6"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <h3 className="text-lg font-semibold transition-colors group-hover:text-primary sm:text-xl">
                                        {post.title}
                                    </h3>
                                    <span className="mt-1 hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
                                        <Clock className="h-3.5 w-3.5" />
                                        {readMinutes(post.content)} min
                                    </span>
                                </div>

                                {post.createdAt && (
                                    <time
                                        dateTime={post.createdAt}
                                        className="mt-1 block text-xs text-muted-foreground"
                                    >
                                        {new Date(post.createdAt).toLocaleDateString(undefined, {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </time>
                                )}

                                {post.content && (
                                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                                        {excerpt(post.content)}
                                    </p>
                                )}

                                {post.tags && post.tags.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {post.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <span className="mt-3 inline-block text-sm font-medium text-primary">
                                    Read more →
                                </span>
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
                        ← Newer
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        disabled={page === totalPages || loading}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Older →
                    </Button>
                </div>
            )}
        </div>
    );
}
