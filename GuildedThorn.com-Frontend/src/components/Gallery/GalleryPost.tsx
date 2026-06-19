import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Card } from "@components/ui/Card.tsx";
import { Button } from "@components/ui/Button";
import { useAuth } from "@components/AuthContext";
import Seo from "@components/Seo";

interface ImageData {
    id: string;
    title: string;
    description: string;
    createdAt: string;
    fileType: string;
    metaData: Record<string, string>;
    tags?: string[];
}

export default function GalleryPost() {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isOwner = user?.role === "owner";

    const [images, setImages] = useState<ImageData[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch first 100 images for navigation
    useEffect(() => {
        fetch("/api/gallery/getImages?page=1&pageSize=50")
            .then(res => res.json())
            .then(data => {
                setImages(data.items || []);
                const index = data.items.findIndex((img: ImageData) => img.id === id);
                setCurrentIndex(index >= 0 ? index : 0);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [id]);

    if (loading) return <div className="text-muted-foreground">Loading...</div>;
    if (error) return <div className="text-destructive">Error: {error}</div>;
    if (!images.length) return <div className="text-muted-foreground">No images found</div>;

    const image = images[currentIndex];

    const handleDelete = async () => {
        if (!image || !window.confirm(`Delete “${image.title}”? This can't be undone.`)) return;
        try {
            const res = await fetch(`/api/gallery/${image.id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error((await res.text()) || "Delete failed");
            navigate("/gallery/images");
        } catch (err) {
            window.alert((err as Error).message);
        }
    };

    const goPrevious = () => {
        const prevIndex = (currentIndex === 0 ? images.length - 1 : currentIndex - 1);
        setCurrentIndex(prevIndex);
        navigate(`/gallery/images/${images[prevIndex].id}`);
    };

    const goNext = () => {
        const nextIndex = (currentIndex === images.length - 1 ? 0 : currentIndex + 1);
        setCurrentIndex(nextIndex);
        navigate(`/gallery/images/${images[nextIndex].id}`);
    };

    const arrowClass =
        "absolute z-10 flex h-10 w-10 items-center justify-center rounded-full " +
        "border border-border bg-background/80 shadow-md backdrop-blur " +
        "transition-colors hover:bg-muted hover:text-primary " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

    return (
        <article>
            <Seo
                title={image.title}
                description={image.description}
                image={`/images/gallery/${image.id}.${image.fileType}`}
                path={`/gallery/images/${image.id}`}
            />
            <Card>
                <div className="mb-2 flex items-start justify-between gap-3">
                    <h1>{image.title}</h1>
                    {isOwner && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                            className="shrink-0"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </Button>
                    )}
                </div>
                <p className="mb-2 text-sm text-muted-foreground">{image.description}</p>

                {image.tags && image.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1.5">
                        {image.tags.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <div className="relative flex items-center justify-center">
                    {/* Left arrow */}
                    <button
                        onClick={goPrevious}
                        aria-label="Previous image"
                        className={`${arrowClass} left-2`}
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>

                    {/* Image */}
                    <img
                        src={`/images/gallery/${image.id}.${image.fileType}`}
                        alt={image.title}
                        className="max-h-[70vh] max-w-full rounded-xl shadow-md"
                        decoding="async"
                    />

                    {/* Right arrow */}
                    <button
                        onClick={goNext}
                        aria-label="Next image"
                        className={`${arrowClass} right-2`}
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                </div>

                {/* Metadata */}
                {image.metaData && Object.keys(image.metaData).length > 0 && (
                    <div className="tile mt-6 p-4 text-left">
                        <p className="eyebrow mb-3">Photo metadata</p>
                        <dl className="grid gap-3 sm:grid-cols-2">
                            {Object.entries(image.metaData).map(([key, value]) => (
                                <div key={key} className="rounded-lg bg-background/60 p-3">
                                    <dt className="eyebrow">{key}</dt>
                                    <dd className="mt-0.5 break-words text-sm font-medium">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                )}

                <p className="mt-4 text-xs text-muted-foreground">
                    Uploaded: {new Date(image.createdAt).toLocaleString()}
                </p>
            </Card>
        </article>
    );
}
