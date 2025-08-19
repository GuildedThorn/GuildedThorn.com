import { Outlet } from 'react-router-dom';
import GalleryNav from "@components/ui/GalleryNav.tsx";

export default function GalleryLayout() {
    return (
        <div className="flex flex-col bg-white text-gray-800 dark:bg-gray-900 dark:text-white">
            <header>
                <GalleryNav/>
            </header>

            <main className="flex-grow container mx-auto p-6">
                <Outlet />
            </main>
        </div>
    );
}
