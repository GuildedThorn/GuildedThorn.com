import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Inbox, PenLine, ImagePlus, HandCoins } from "lucide-react";
import { cn } from "@lib/utils";
import { useAuth } from "@components/AuthContext";
import { getDonationConfig, setDonationsPublished } from "@backend/api";

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
	const isOwner = !loading && user?.role === "owner";

	// Donations kill switch: reflects the published flag and lets the owner flip
	// public visibility live. Loaded only when the owner is present.
	const [published, setPublished] = useState<boolean | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!isOwner) return;
		let alive = true;
		getDonationConfig()
			.then((c) => alive && setPublished(c.published))
			.catch(() => alive && setPublished(null));
		return () => {
			alive = false;
		};
	}, [isOwner]);

	if (!isOwner) return null;

	const toggleDonations = async () => {
		if (published === null || saving) return;
		const next = !published;
		setSaving(true);
		try {
			await setDonationsPublished(next);
			setPublished(next);
		} catch {
			/* leave the previous state; a failed toggle just doesn't change it */
		} finally {
			setSaving(false);
		}
	};

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
				<button
					type="button"
					onClick={toggleDonations}
					disabled={published === null || saving}
					title="Show or hide the donate page for the public"
					className={cn(
						"nav-link shrink-0 disabled:opacity-50",
						published && "text-success",
					)}
				>
					<HandCoins className="h-4 w-4" />
					Donations: {published === null ? "…" : published ? "On" : "Off"}
				</button>
			</div>
		</div>
	);
}
