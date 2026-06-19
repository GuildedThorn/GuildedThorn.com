import { Outlet } from 'react-router-dom';
import GalleryNav from "@components/ui/GalleryNav.tsx";

export default function GalleryLayout() {
    return (
        <div className="flex min-h-dvh flex-col bg-background text-foreground">
            <header>
                <GalleryNav/>
            </header>

            <main className="page flex-grow">
                <Outlet />
            </main>
        </div>
    );
}
