import React, { useState } from "react";
import exifr from "exifr";
import { Lock, Check, X, Loader2 } from "lucide-react";
import { Input } from "@components/ui/Input";
import { Textarea } from "@components/ui/TextArea";
import { Button } from "@components/ui/Button";
import { useAuth } from "@components/AuthContext";
import { cn } from "@lib/utils";

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function titleFromName(name: string): string {
    return name.replace(/\.[^./\\]+$/, "");
}

// Pull the interesting photographic EXIF fields out of the file, formatted.
async function readExif(file: File): Promise<Record<string, string>> {
    try {
        const d = await exifr.parse(file, [
            "Make",
            "Model",
            "LensModel",
            "FocalLength",
            "FNumber",
            "ExposureTime",
            "ISO",
            "DateTimeOriginal",
        ]);
        if (!d) return {};

        const out: Record<string, string> = {};
        const camera = [d.Make, d.Model].filter(Boolean).join(" ").trim();
        if (camera) out.Camera = camera;
        if (d.LensModel) out.Lens = String(d.LensModel).trim();
        if (d.FocalLength) out["Focal length"] = `${Math.round(d.FocalLength)} mm`;
        if (d.FNumber) out.Aperture = `f/${d.FNumber}`;
        if (d.ExposureTime)
            out.Shutter = d.ExposureTime >= 1 ? `${d.ExposureTime}s` : `1/${Math.round(1 / d.ExposureTime)}s`;
        if (d.ISO) out.ISO = String(d.ISO);
        if (d.DateTimeOriginal) out.Taken = new Date(d.DateTimeOriginal).toLocaleString();
        return out;
    } catch {
        return {};
    }
}

type Mode = "single" | "bulk";
type BulkItem = { file: File; status: "pending" | "uploading" | "done" | "error"; msg?: string };

export default function GalleryUpload() {
    const { user, loading } = useAuth();
    const isOwner = user?.role === "owner";

    const [mode, setMode] = useState<Mode>("single");
    const [tags, setTags] = useState("");

    // Single upload
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);
    const [exif, setExif] = useState<Record<string, string>>({});
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("");

    // Bulk upload
    const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
    const [bulkUploading, setBulkUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0] || null;
        setFile(selected);
        setDimensions(null);
        setExif({});

        if (selected) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setPreview(result);
                const img = new Image();
                img.onload = () => setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
                img.src = result;
            };
            reader.readAsDataURL(selected);
            void readExif(selected).then(setExif);
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
            formData.append("tags", tags);

            const meta = { ...exif };
            if (dimensions) meta.Dimensions = `${dimensions.w} × ${dimensions.h}`;
            if (Object.keys(meta).length) formData.append("metadata", JSON.stringify(meta));

            const res = await fetch("/api/gallery", {
                method: "POST",
                body: formData,
                credentials: "include",
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
                setDimensions(null);
                setExif({});
                setTitle("");
                setDescription("");
            } else {
                setStatus(`❌ Error: ${data.message || "Failed to upload image"}`);
            }
        } catch (err) {
            setStatus(`❌ Error: ${(err as Error).message}`);
        }
    };

    const addBulkFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
        setBulkItems((prev) => [
            ...prev,
            ...picked.map((f) => ({ file: f, status: "pending" as const })),
        ]);
        e.target.value = ""; // allow re-selecting the same files
    };

    const removeBulk = (index: number) =>
        setBulkItems((prev) => prev.filter((_, i) => i !== index));

    const uploadBulk = async () => {
        setBulkUploading(true);
        for (let i = 0; i < bulkItems.length; i++) {
            if (bulkItems[i].status === "done") continue;
            setBulkItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, status: "uploading" } : it)));
            try {
                const f = bulkItems[i].file;
                const meta = await readExif(f);
                const fd = new FormData();
                fd.append("file", f);
                fd.append("title", titleFromName(f.name));
                fd.append("description", "");
                fd.append("tags", tags);
                if (Object.keys(meta).length) fd.append("metadata", JSON.stringify(meta));

                const res = await fetch("/api/gallery", {
                    method: "POST",
                    body: fd,
                    credentials: "include",
                });
                if (!res.ok) throw new Error((await res.text()) || "Upload failed");

                setBulkItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, status: "done" } : it)));
            } catch (err) {
                setBulkItems((prev) =>
                    prev.map((it, idx) =>
                        idx === i ? { ...it, status: "error", msg: (err as Error).message } : it,
                    ),
                );
            }
        }
        setBulkUploading(false);
    };

    const doneCount = bulkItems.filter((i) => i.status === "done").length;
    const pendingCount = bulkItems.filter((i) => i.status === "pending" || i.status === "error").length;

    if (loading) {
        return <div className="page text-center text-muted-foreground">Loading…</div>;
    }

    if (!isOwner) {
        return (
            <div className="panel mx-auto mt-8 max-w-md p-8 text-center">
                <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <h1 className="text-xl font-semibold">Owner only</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    You don’t have permission to upload gallery images.
                </p>
            </div>
        );
    }

    const meta: { label: string; value: string }[] = [
        { label: "Title", value: title || "—" },
        { label: "Description", value: description || "—" },
        ...Object.entries(exif).map(([label, value]) => ({ label, value })),
        { label: "File", value: file?.name || "—" },
        { label: "Type", value: file?.type || "—" },
        { label: "Size", value: file ? formatBytes(file.size) : "—" },
        { label: "Dimensions", value: dimensions ? `${dimensions.w} × ${dimensions.h}` : "—" },
    ];

    return (
        <div className="page text-left">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold">Upload to Gallery</h1>
                <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
                    {(["single", "bulk"] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={cn(
                                "rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors",
                                mode === m
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>

            {/* Shared tags */}
            <div className="mb-6">
                <label htmlFor="gallery-tags" className="field-label">
                    Tags <span className="font-normal text-muted-foreground">(comma separated)</span>
                </label>
                <Input
                    id="gallery-tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. nature, macro, canon"
                />
            </div>

            {mode === "single" ? (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Form */}
                    <form onSubmit={handleSubmit} className="panel space-y-4 p-6">
                        <div>
                            <label htmlFor="gallery-file" className="field-label">
                                Select Image
                            </label>
                            <Input
                                id="gallery-file"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="gallery-title" className="field-label">
                                Title
                            </label>
                            <Input
                                id="gallery-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter image title"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="gallery-description" className="field-label">
                                Description
                            </label>
                            <Textarea
                                id="gallery-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="h-24"
                                placeholder="Enter image description"
                                required
                            />
                        </div>

                        <Button type="submit">Upload Image</Button>
                        {status && <p className="text-sm">{status}</p>}
                    </form>

                    {/* Live metadata preview */}
                    <div className="panel p-6">
                        <h2 className="mb-4 text-lg font-semibold">Metadata preview</h2>
                        {preview ? (
                            <img
                                src={preview}
                                alt="Preview"
                                className="mb-4 max-h-64 w-full rounded-xl border border-border object-contain shadow-sm"
                            />
                        ) : (
                            <div className="mb-4 flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                                No image selected
                            </div>
                        )}
                        <dl className="grid gap-3 sm:grid-cols-2">
                            {meta.map(({ label, value }) => (
                                <div key={label} className="rounded-lg bg-muted/50 p-3">
                                    <dt className="eyebrow">{label}</dt>
                                    <dd className="mt-0.5 break-words text-sm font-medium">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            ) : (
                <div className="panel space-y-4 p-6">
                    <p className="text-sm text-muted-foreground">
                        Pick multiple images or a whole folder. Each file’s name becomes its title, EXIF is
                        read automatically, and the tags above apply to all of them.
                    </p>

                    <div className="flex flex-wrap gap-3">
                        <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted">
                            Select images
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={addBulkFiles}
                                className="hidden"
                            />
                        </label>
                        <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted">
                            Select folder
                            <input
                                type="file"
                                multiple
                                ref={(el) => {
                                    el?.setAttribute("webkitdirectory", "");
                                }}
                                onChange={addBulkFiles}
                                className="hidden"
                            />
                        </label>
                        {bulkItems.length > 0 && !bulkUploading && (
                            <button
                                type="button"
                                onClick={() => setBulkItems([])}
                                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {bulkItems.length > 0 && (
                        <>
                            <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                                {bulkItems.map((item, i) => (
                                    <li
                                        key={`${item.file.name}-${i}`}
                                        className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                                    >
                                        <span className="shrink-0">
                                            {item.status === "done" ? (
                                                <Check className="h-4 w-4 text-success" />
                                            ) : item.status === "uploading" ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                            ) : item.status === "error" ? (
                                                <X className="h-4 w-4 text-destructive" />
                                            ) : (
                                                <span className="block h-2 w-2 rounded-full bg-muted-foreground/40" />
                                            )}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
                                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                            {formatBytes(item.file.size)}
                                        </span>
                                        {!bulkUploading && item.status !== "done" && (
                                            <button
                                                type="button"
                                                onClick={() => removeBulk(i)}
                                                aria-label="Remove"
                                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>

                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm text-muted-foreground tabular-nums">
                                    {doneCount} / {bulkItems.length} uploaded
                                </span>
                                <Button onClick={uploadBulk} disabled={bulkUploading || pendingCount === 0}>
                                    {bulkUploading ? "Uploading…" : `Upload ${pendingCount} image${pendingCount === 1 ? "" : "s"}`}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
