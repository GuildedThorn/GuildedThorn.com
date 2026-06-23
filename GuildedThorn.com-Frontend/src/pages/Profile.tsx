import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Crown, Heart, Radio as RadioIcon, Video, CalendarDays } from "lucide-react";
import { Avatar } from "@components/ui/Avatar";
import { cn } from "@lib/utils";
import { getUserProfile, type UserProfile } from "@backend/api";
import Seo from "@components/Seo";

function formatDuration(seconds: number): string {
	if (seconds < 60) return "0m";
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

const money = new Intl.NumberFormat(undefined, {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 0,
});

function Profile() {
	const { username = "" } = useParams<{ username: string }>();
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);

	useEffect(() => {
		let alive = true;
		setLoading(true);
		setNotFound(false);
		getUserProfile(username)
			.then((p) => {
				if (!alive) return;
				if (p) setProfile(p);
				else setNotFound(true);
			})
			.catch(() => alive && setNotFound(true))
			.finally(() => alive && setLoading(false));
		return () => {
			alive = false;
		};
	}, [username]);

	if (loading) {
		return (
			<div className="page">
				<div className="panel p-8 text-center text-muted-foreground">Loading…</div>
			</div>
		);
	}

	if (notFound || !profile) {
		return (
			<div className="page">
				<Seo title={`@${username}`} description="User profile" path={`/u/${username}`} />
				<div className="panel mx-auto max-w-md p-8 text-center">
					<h1 className="text-2xl font-semibold">User not found</h1>
					<p className="mt-1.5 text-sm text-muted-foreground">
						No account exists for <span className="font-medium">@{username}</span>.
					</p>
				</div>
			</div>
		);
	}

	const isOwner = profile.role === "owner";
	const isSupporter = profile.totalDonatedCents > 0;

	return (
		<div className="page">
			<Seo
				title={`@${profile.username}`}
				description={`${profile.username}'s profile on GuildedThorn`}
				path={`/u/${profile.username}`}
			/>

			{/* Identity header */}
			<section className="mx-auto max-w-2xl">
				<div className="panel flex flex-col items-center p-6 text-center sm:p-8">
					<Avatar
						src={profile.avatarUrl}
						name={profile.username}
						className="h-20 w-20 text-2xl"
					/>
					<div className="mt-4 flex items-center gap-2">
						<h1 className="text-2xl font-bold tracking-tight">@{profile.username}</h1>
						{isOwner && (
							<span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
								<Crown className="h-3.5 w-3.5" /> Owner
							</span>
						)}
						{isSupporter && (
							<span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
								<Heart className="h-3.5 w-3.5" /> Supporter
							</span>
						)}
					</div>
					<p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
						<CalendarDays className="h-4 w-4" />
						Member since {formatDate(profile.createdAt)}
					</p>
				</div>
			</section>

			{/* Stats */}
			<section className="mx-auto mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
				<StatCard
					icon={<RadioIcon className="h-5 w-5" />}
					label="Radio listened"
					value={formatDuration(profile.radioSeconds)}
				/>
				<StatCard
					icon={<Video className="h-5 w-5" />}
					label="Stream watched"
					value={formatDuration(profile.streamSeconds)}
				/>
				{isSupporter && (
					<StatCard
						icon={<Heart className="h-5 w-5 text-success" />}
						label={`Donated${profile.supporterSince ? ` · since ${formatDate(profile.supporterSince)}` : ""}`}
						value={money.format(profile.totalDonatedCents / 100)}
						className="sm:col-span-2"
					/>
				)}
			</section>
		</div>
	);
}

function StatCard({
	icon,
	label,
	value,
	className,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	className?: string;
}) {
	return (
		<div className={cn("panel flex items-center gap-4 p-5", className)}>
			<span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted text-primary">
				{icon}
			</span>
			<div className="min-w-0">
				<p className="text-xl font-semibold">{value}</p>
				<p className="truncate text-sm text-muted-foreground">{label}</p>
			</div>
		</div>
	);
}

export default Profile;
