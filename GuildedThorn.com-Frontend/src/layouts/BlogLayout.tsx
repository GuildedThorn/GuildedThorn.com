import { Outlet } from 'react-router-dom';
import BlogNav from "@components/ui/BlogNav.tsx";

export default function BlogLayout() {
    return (
        <div className="flex flex-col bg-white text-gray-800 dark:bg-gray-900 dark:text-white">
            <header>
                <BlogNav/>
            </header>

            <main className="flex-grow container mx-auto p-6">
                <Outlet />
            </main>
        </div>
    );
}
