import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface BlogPost {
    id: string;  // ObjectId string, not number
    title: string;
}

export default function BlogList() {
    const [posts, setPosts] = useState<BlogPost[]>([]);

    useEffect(() => {
        fetch("/api/blog/getPosts")
            .then((res) => res.json())
            .then((data) => {
                setPosts(data.items);  // get the 'items' array from response
            })
            .catch(console.error);
    }, []);

    return (
        <div>
            <h2 className="text-2xl font-semibold mb-4">Recent Posts</h2>
            <ul className="space-y-2">
                {posts.map((post) => (
                    <li key={post.id}>
                        <Link
                            to={`/blog/pages/${post.id}`}
                            className="text-blue-600 hover:underline"
                        >
                            {post.title}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
