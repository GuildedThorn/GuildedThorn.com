import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";

export default function KnowledgeBaseNav() {
  return (
    <div className="sticky top-0 z-40 px-3 pt-3">
      <nav className="mx-auto max-w-7xl rounded-2xl border border-border bg-card/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="flex h-14 items-center justify-between gap-2 px-4 sm:px-6">
          <Link to="/kb" className="flex items-center gap-2">
            <BookOpen className="text-lg text-primary" />
            <span className="text-lg font-extrabold tracking-tight text-primary">
              Knowledge Base
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <Link to="/" className="nav-link" title="Back to site">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to site</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
