import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from '@lib/rehypeHighlight';
import 'highlight.js/styles/github-dark.css';
import { Card } from "@components/ui/Card.tsx";
import { useAuth } from '@components/AuthContext';
import { stripFrontmatter } from '@lib/frontmatter';
import Seo from "@components/Seo";

interface BlogPost {
    id: string;
    title: string;
    content: string;
    createdAt?: string;
    tags?: string[];
}

interface PostSummary {
    id: string;
    title: string;
}

export default function BlogPost() {
    const { id } = useParams<{ id?: string }>();
    const { user } = useAuth();
    const isOwner = user?.role === "owner";
    const [post, setPost] = useState<BlogPost | null>(null);
    const [allPosts, setAllPosts] = useState<PostSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setError("No post ID provided");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        window.scrollTo({ top: 0 });

        fetch(`/api/blog/${id}`)
            .then(res => {
                if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
                return res.json();
            })
            .then(data => {
                setPost(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [id]);

    // Neighbor list for prev/next navigation (newest first, same order as the API)
    useEffect(() => {
        fetch("/api/blog/getPosts?page=1&pageSize=100")
            .then(res => res.json())
            .then(data => setAllPosts(data.items ?? []))
            .catch(console.error);
    }, []);

    if (loading) return <div className="text-muted-foreground">Loading...</div>;
    if (error) return <div className="text-destructive">Error: {error}</div>;
    if (!post) return <div className="text-muted-foreground">Post not found</div>;

    const body = stripFrontmatter(post.content);
    const words = body.trim() ? body.trim().split(/\s+/).length : 0;
    const readingMinutes = Math.max(1, Math.round(words / 200));
    const excerpt = body
        .replace(/[#*`>_~[\]()]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 155);

    const index = allPosts.findIndex(p => p.id === id);
    const newer = index > 0 ? allPosts[index - 1] : null;
    const older = index >= 0 && index < allPosts.length - 1 ? allPosts[index + 1] : null;

    return (
        <article className="w-full text-left">
            <Seo title={post.title} description={excerpt} path={`/blog/pages/${id}`} />
            <div className="mb-4 flex items-center justify-between">
                <Link
                    to="/blog/pages"
                    className="inline-flex items-center gap-1.5 text-sm font-medium
                        text-muted-foreground transition-colors hover:text-primary"
                >
                    <ArrowLeft className="h-4 w-4" />
                    All posts
                </Link>
                {isOwner && (
                    <Link
                        to={`/blog/upload?edit=${id}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border
                            bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm
                            transition-colors hover:border-primary/50 hover:text-primary"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                    </Link>
                )}
            </div>

            <Card className="px-6 py-8 text-left sm:px-10">
                <header className="mb-8 border-b border-border pb-6">
                    <h1 className="mb-3">{post.title}</h1>
                    <p className="text-sm text-muted-foreground">
                        {post.createdAt && (
                            <time dateTime={post.createdAt}>
                                {new Date(post.createdAt).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </time>
                        )}
                        {post.createdAt && " · "}
                        {readingMinutes} min read
                    </p>

                    {post.tags && post.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {post.tags.map((tag) => (
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
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                        {body}
                    </ReactMarkdown>
                </div>
            </Card>

            {(newer || older) && (
                <nav className="mt-6 grid gap-4 sm:grid-cols-2" aria-label="Post navigation">
                    {newer ? (
                        <Link
                            to={`/blog/pages/${newer.id}`}
                            className="group panel p-4
                                transition-all hover:border-primary/50 hover:shadow-md"
                        >
                            <span className="text-xs text-muted-foreground">← Newer</span>
                            <p className="mt-1 truncate font-medium group-hover:text-primary">
                                {newer.title}
                            </p>
                        </Link>
                    ) : (
                        <span />
                    )}
                    {older && (
                        <Link
                            to={`/blog/pages/${older.id}`}
                            className="group panel p-4 text-right
                                transition-all hover:border-primary/50 hover:shadow-md"
                        >
                            <span className="text-xs text-muted-foreground">Older →</span>
                            <p className="mt-1 truncate font-medium group-hover:text-primary">
                                {older.title}
                            </p>
                        </Link>
                    )}
                </nav>
            )}
        </article>
    );
}
