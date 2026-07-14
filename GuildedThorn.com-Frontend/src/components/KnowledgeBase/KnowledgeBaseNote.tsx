import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from '@lib/rehypeHighlight';
import 'highlight.js/styles/github-dark.css';
import { Card } from "@components/ui/Card.tsx";
import Seo from "@components/Seo";
import LazyOnVisible from "@components/LazyOnVisible.tsx";

const KnowledgeGraph = lazy(() => import("./KnowledgeGraph.tsx"));

interface NoteLink {
    slug: string;
    title: string;
}

interface KnowledgeBaseNote {
    slug: string;
    title: string;
    folder: string;
    content: string;
    tags?: string[];
    lastChangedAt?: string;
    outgoingLinks?: NoteLink[];
    backlinks?: NoteLink[];
}

interface KnowledgeBaseNoteProps {
    /** Fixed slug to render (used for the /kb home route — the vault's own "Welcome" note). */
    slug?: string;
}

export default function KnowledgeBaseNote({ slug: fixedSlug }: KnowledgeBaseNoteProps) {
    const { slug: routeSlug } = useParams<{ slug?: string }>();
    const slug = fixedSlug ?? routeSlug;
    // True only for the fixed-slug home route — not just "no route param",
    // since that would also (incorrectly) match a bare /kb/ with no slug.
    const isHome = !!fixedSlug;
    const [note, setNote] = useState<KnowledgeBaseNote | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) {
            setError("No note specified");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        window.scrollTo({ top: 0 });

        fetch(`/api/knowledgebase/notes/${slug}`)
            .then(res => {
                if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
                return res.json();
            })
            .then(data => {
                setNote(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [slug]);

    if (loading) return <div className="text-muted-foreground">Loading...</div>;
    if (error) return <div className="text-destructive">Error: {error}</div>;
    if (!note) return <div className="text-muted-foreground">Note not found</div>;

    const excerpt = note.content
        .replace(/[#*`>_~[\]()]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 155);

    return (
        <article className="w-full text-left">
            <Seo title={note.title} description={excerpt} path={isHome ? "/kb" : `/kb/${slug}`} />
            {!isHome && (
                <div className="mb-4 flex items-center justify-between">
                    <Link
                        to="/kb"
                        viewTransition
                        className="inline-flex items-center gap-1.5 text-sm font-medium
                            text-muted-foreground transition-colors hover:text-primary"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Home
                    </Link>
                    {note.folder && (
                        <span className="text-sm text-muted-foreground">{note.folder}</span>
                    )}
                </div>
            )}

            <Card className="px-6 py-8 text-left sm:px-10">
                <header className="mb-8 border-b border-border pb-6">
                    <h1 className="mb-3">{note.title}</h1>
                    {note.lastChangedAt && (
                        <p className="text-sm text-muted-foreground">
                            <time dateTime={note.lastChangedAt}>
                                Updated{" "}
                                {new Date(note.lastChangedAt).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </time>
                        </p>
                    )}

                    {note.tags && note.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {note.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </header>

                <div
                    className="prose prose-gray max-w-none break-words dark:prose-invert
                        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                        prose-img:rounded-xl prose-pre:rounded-xl"
                >
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                            img: (props) => <img src={props.src} alt={props.alt} title={props.title} loading="lazy" />,
                        }}
                    >
                        {note.content}
                    </ReactMarkdown>
                </div>
            </Card>

            {((note.outgoingLinks?.length ?? 0) > 0 || (note.backlinks?.length ?? 0) > 0) && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {note.outgoingLinks && note.outgoingLinks.length > 0 && (
                        <div className="panel p-4">
                            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                                <ArrowUpRight className="h-4 w-4" />
                                Links to
                            </h2>
                            <ul className="space-y-1.5">
                                {note.outgoingLinks.map((link) => (
                                    <li key={link.slug}>
                                        <Link
                                            to={`/kb/${link.slug}`}
                                            viewTransition
                                            className="text-sm text-foreground transition-colors hover:text-primary"
                                        >
                                            {link.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {note.backlinks && note.backlinks.length > 0 && (
                        <div className="panel p-4">
                            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                                <ArrowDownLeft className="h-4 w-4" />
                                Backlinks
                            </h2>
                            <ul className="space-y-1.5">
                                {note.backlinks.map((link) => (
                                    <li key={link.slug}>
                                        <Link
                                            to={`/kb/${link.slug}`}
                                            viewTransition
                                            className="text-sm text-foreground transition-colors hover:text-primary"
                                        >
                                            {link.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-8">
                <h2 className="mb-3 text-xl font-semibold">Graph</h2>
                <LazyOnVisible
                    rootMargin="300px"
                    fallback={<div className="panel h-[560px] w-full animate-pulse bg-card/40" />}
                >
                    <Suspense fallback={<div className="panel h-[560px] w-full animate-pulse bg-card/40" />}>
                        <KnowledgeGraph focusSlug={slug} />
                    </Suspense>
                </LazyOnVisible>
            </div>
        </article>
    );
}
