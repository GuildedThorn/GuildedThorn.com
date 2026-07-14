import { Outlet } from 'react-router-dom';
import KnowledgeBaseNav from "@components/ui/KnowledgeBaseNav.tsx";
import KnowledgeBaseSidebar from "@components/KnowledgeBase/KnowledgeBaseSidebar.tsx";

export default function KnowledgeBaseLayout() {
    return (
        <div className="flex min-h-dvh flex-col bg-background text-foreground">
            <header>
                <KnowledgeBaseNav/>
            </header>

            <main className="page flex-grow">
                <div className="flex flex-col gap-6 md:flex-row md:items-start">
                    <aside className="panel w-full shrink-0 p-3 md:sticky md:top-20 md:w-64">
                        <KnowledgeBaseSidebar />
                    </aside>
                    <div className="min-w-0 flex-1">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}
