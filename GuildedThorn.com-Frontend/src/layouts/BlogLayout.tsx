import { Outlet } from 'react-router-dom';
import BlogNav from "@components/ui/BlogNav.tsx";

export default function BlogLayout() {
    return (
        <div className="flex min-h-dvh flex-col bg-background text-foreground">
            <header>
                <BlogNav/>
            </header>

            <main className="page flex-grow">
                <Outlet />
            </main>
        </div>
    );
}
