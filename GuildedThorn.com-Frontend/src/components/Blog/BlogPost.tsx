import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import {Card} from "@components/ui/Card.tsx";

interface BlogPost {
    id: string;
    title: string;
    content: string;
}

export default function BlogPost() {
    const { id } = useParams<{ id?: string }>();
    const [post, setPost] = useState<BlogPost | null>(null);
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

    if (loading) return <div>Loading...</div>;
    if (error) return <div className="text-red-600">Error: {error}</div>;
    if (!post) return <div>Post not found</div>;

    return (
        <article className="mx-auto px-4">
            <Card title={post.title}>
                <h1 className="font-[Caveat,_cursive] mb-2">{post.title}</h1>
                <div className="prose dark:prose-invert mt-4 space-y-2 text-sm md:text-base overflow-x-auto">
                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                        {post.content}
                    </ReactMarkdown>
                </div>
            </Card>
        </article>
    );
}
