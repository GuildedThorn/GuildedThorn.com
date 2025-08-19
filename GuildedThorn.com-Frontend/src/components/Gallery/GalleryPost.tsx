import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@components/ui/Card.tsx";

interface ImageData {
    id: string;
    title: string;
    description: string;
    createdAt: string;
    fileType: string;
    metaData: Record<string, string>;
}

export default function GalleryPost() {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();

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

    if (loading) return <div>Loading...</div>;
    if (error) return <div className="text-red-600">Error: {error}</div>;
    if (!images.length) return <div>No images found</div>;

    const image = images[currentIndex];

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

    return (
        <article className="mx-auto px-4">
            <Card title={image.title}>
                <h1 className="font-[Caveat,_cursive] mb-2">{image.title}</h1>
                <p className="text-gray-600 text-sm mb-4">{image.description}</p>

                <div className="relative flex items-center justify-center">
                    {/* Left arrow */}
                    <button
                        onClick={goPrevious}
                        className="absolute left-0 text-3xl p-2 hover:bg-gray-200 rounded-full dark:hover:bg-gray-700"
                    >
                        ←
                    </button>

                    {/* Image */}
                    <img
                        src={`/images/gallery/${image.id}.${image.fileType}`}
                        alt={image.title}
                        className="max-w-full max-h-[70vh] rounded-lg shadow"
                    />

                    {/* Right arrow */}
                    <button
                        onClick={goNext}
                        className="absolute right-0 text-3xl p-2 hover:bg-gray-200 rounded-full dark:hover:bg-gray-700"
                    >
                        →
                    </button>
                </div>

                {/* Metadata */}
                <div className="mt-4">
                    <h2 className="font-semibold">Metadata</h2>
                    <ul className="text-sm text-gray-700 dark:text-gray-300">
                        {Object.entries(image.metaData || {}).map(([key, value]) => (
                            <li key={key}>
                                <span className="font-medium">{key}:</span> {value}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                    Uploaded: {new Date(image.createdAt).toLocaleString()}
                </p>
            </Card>
        </article>
    );
}
