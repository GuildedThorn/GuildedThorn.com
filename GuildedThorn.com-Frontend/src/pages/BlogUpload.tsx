import { useState } from "react";

export default function BlogUpload() {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [status, setStatus] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("");

        try {
            const res = await fetch("/api/blog", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ title, content }),
            });

            const text = await res.text(); // read ONCE

            let data;
            try {
                data = JSON.parse(text); // try parse JSON
            } catch {
                data = { message: text }; // fallback to plain text
            }

            if (res.ok) {
                setStatus(`✅ ${data.message || "Post created successfully!"}`);
                setTitle("");
                setContent("");
            } else {
                setStatus(`❌ Error: ${data.message || "Failed to create post"}`);
            }
        } catch (err) {
            setStatus(`❌ Error: ${(err as Error).message}`);
        }
    };


    return (
        <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">Upload a Blog Post</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-1 font-medium">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white"
                        placeholder="Enter blog title"
                        required
                    />
                </div>

                <div>
                    <label className="block mb-1 font-medium">Content</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full border rounded p-2 h-40 dark:bg-gray-800 dark:text-white"
                        placeholder="Write your blog content..."
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Submit Post
                </button>
            </form>

            {status && <p className="mt-4">{status}</p>}
        </div>
    );
}
