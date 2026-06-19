import { NavLink } from "react-router-dom";
import { Inbox, PenLine, ImagePlus } from "lucide-react";
import { cn } from "@lib/utils";
import { useAuth } from "@components/AuthContext";

/* A slim admin strip rendered just below the main NavBar, shown only to the
   owner. Keeps owner-only actions out of the primary nav to free up space. */

const items = [
	{ to: "/inbox", label: "Inbox", icon: <Inbox className="h-4 w-4" /> },
	{ to: "/blog/upload", label: "New post", icon: <PenLine className="h-4 w-4" /> },
	{
		to: "/gallery/upload",
		label: "Upload image",
		icon: <ImagePlus className="h-4 w-4" />,
	},
];

export default function OwnerBar() {
	const { user, loading } = useAuth();
	if (loading || user?.role !== "owner") return null;

	return (
		<div className="px-3 pt-2 print:hidden">
			<div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 px-2 py-1.5">
				<span className="eyebrow mr-1 shrink-0 px-1.5">Owner</span>
				{items.map((it) => (
					<NavLink
						key={it.to}
						to={it.to}
						className={({ isActive }) =>
							cn("nav-link shrink-0", isActive && "bg-muted text-primary")
						}
					>
						{it.icon}
						{it.label}
					</NavLink>
				))}
			</div>
		</div>
	);
}
