import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { ChevronRight, Folder } from "lucide-react";
import { cn } from "@lib/utils";

interface TreeNote {
    slug: string;
    title: string;
}

interface TreeFolder {
    folder: string;
    notes: TreeNote[];
}

// The vault's own folders carry numeric prefixes ("01 Maps") purely to fix
// their order — strip that for display, keep it for sorting (already done
// server-side).
function displayFolderName(folder: string): string {
    return folder.replace(/^\d+\s*/, "");
}

export default function KnowledgeBaseSidebar() {
    const { slug: activeSlug } = useParams<{ slug?: string }>();
    const [tree, setTree] = useState<TreeFolder[]>([]);

    useEffect(() => {
        fetch("/api/knowledgebase/tree")
            .then((res) => res.json())
            .then((data) => setTree(Array.isArray(data) ? data : []))
            .catch(console.error);
    }, []);

    const general = tree.find((f) => f.folder === "");
    const folders = tree.filter((f) => f.folder !== "");

    const linkClass = ({ isActive }: { isActive: boolean }) =>
        cn(
            "block truncate rounded-md px-2 py-1 transition-colors",
            isActive
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
        );

    return (
        <nav aria-label="Knowledge base contents" className="text-sm">
            {general && general.notes.length > 0 && (
                <ul className="mb-3 space-y-0.5 border-b border-border pb-3">
                    {general.notes.map((n) => (
                        <li key={n.slug}>
                            <NavLink to={`/kb/${n.slug}`} viewTransition className={linkClass}>
                                {n.title}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            )}

            <ul className="space-y-1">
                {folders.map((f) => (
                    <li key={f.folder}>
                        <details className="group" open={f.notes.some((n) => n.slug === activeSlug)}>
                            <summary
                                className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1.5
                                    text-sm font-medium text-foreground transition-colors hover:bg-accent
                                    [&::-webkit-details-marker]:hidden"
                            >
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                                <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="truncate">{displayFolderName(f.folder)}</span>
                            </summary>
                            <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
                                {f.notes.map((n) => (
                                    <li key={n.slug}>
                                        <NavLink to={`/kb/${n.slug}`} viewTransition className={linkClass}>
                                            {n.title}
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
