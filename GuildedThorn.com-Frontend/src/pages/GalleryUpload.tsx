import React, { useState } from "react";

export default function GalleryUpload() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0] || null;
        setFile(selected);

        if (selected) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(selected);
        } else {
            setPreview(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("");

        if (!file) {
            setStatus("❌ Please select an image file.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("title", title);
            formData.append("description", description);

            const res = await fetch("/api/gallery", {
                method: "POST",
                body: formData,
            });

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                data = { message: text };
            }

            if (res.ok) {
                setStatus(`✅ ${data.message || "Image uploaded successfully!"}`);
                setFile(null);
                setPreview(null);
                setTitle("");
                setDescription("");
            } else {
                setStatus(`❌ Error: ${data.message || "Failed to upload image"}`);
            }
        } catch (err) {
            setStatus(`❌ Error: ${(err as Error).message}`);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">Upload a Gallery Image</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* File input */}
                <div>
                    <label className="block mb-1 font-medium">Select Image</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white"
                        required
                    />
                </div>

                {/* Image preview */}
                {preview && (
                    <div className="mt-2">
                        <img
                            src={preview}
                            alt="Preview"
                            className="max-h-64 rounded shadow"
                        />
                    </div>
                )}

                {/* Title */}
                <div>
                    <label className="block mb-1 font-medium">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white"
                        placeholder="Enter image title"
                        required
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block mb-1 font-medium">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full border rounded p-2 h-24 dark:bg-gray-800 dark:text-white"
                        placeholder="Enter image description"
                        required
                    />
                </div>

                {/* Submit button */}
                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Upload Image
                </button>
            </form>

            {status && <p className="mt-4">{status}</p>}
        </div>
    );
}
