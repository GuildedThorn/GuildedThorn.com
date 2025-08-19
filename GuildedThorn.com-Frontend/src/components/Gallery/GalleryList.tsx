import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface GalleryImage {
    id: string;
    title: string;
    fileType: string;
}

export default function GalleryList() {
    const [images, setImages] = useState<GalleryImage[]>([]);

    useEffect(() => {
        fetch("/api/gallery/getImages?page=1&pageSize=10")
            .then((res) => res.json())
            .then((data) => {
                setImages(data.items); // grab the 'items' array from response
            })
            .catch(console.error);
    }, []);

    return (
        <div>
            <h2 className="text-2xl font-semibold mb-4">Gallery</h2>
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((img) => (
                    <li key={img.id} className="group">
                        <Link to={`/gallery/images/${img.id}`} className="block">
                            <img
                                src={`/images/gallery/${img.id}.${img.fileType}`}
                                alt={img.title}
                                className="w-full h-40 object-cover rounded shadow group-hover:opacity-80 transition"
                            />
                            <p className="mt-2 text-center text-sm font-medium">
                                {img.title}
                            </p>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
