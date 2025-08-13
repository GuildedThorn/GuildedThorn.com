import { useEffect, useState } from "react";

interface Activity {
	name: string;
	type: number;
	details?: string;
	state?: string;
	assets?: {
		large_image?: string;
		large_text?: string;
		small_image?: string;
		small_text?: string;
	};
	application_id?: string;
}

interface DiscordPresence {
	discord_user: {
		username: string;
		discriminator: string;
		avatar: string | null;
		id: string;
	};
	discord_status: "online" | "idle" | "dnd" | "offline";
	activities: Activity[];
}

const userId = "654849939175768074";

export const Discord = () => {
	const [presence, setPresence] = useState<DiscordPresence | null>(null);
	const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

	useEffect(() => {
		const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
		setIsDarkMode(darkQuery.matches);

		const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
		darkQuery.addEventListener("change", handleChange);
		return () => darkQuery.removeEventListener("change", handleChange);
	}, []);

	useEffect(() => {
		const ws = new WebSocket("wss://api.lanyard.rest/socket");

		ws.onopen = () => {
			ws.send(
				JSON.stringify({
					op: 2,
					d: {
						subscribe_to_id: userId,
					},
				}),
			);
		};

		ws.onmessage = (event) => {
			const { t, d } = JSON.parse(event.data);
			if (t === "INIT_STATE" || t === "PRESENCE_UPDATE") {
				setPresence(d);
			}
		};

		return () => {
			ws.close();
		};
	}, []);

	if (!presence)
		return (
			<div className="text-sm text-gray-400">Connecting to Discord...</div>
		);

	const { discord_user, discord_status, activities } = presence;

	const avatarUrl = discord_user.avatar
		? `https://cdn.discordapp.com/avatars/${discord_user.id}/${discord_user.avatar}.png`
		: `https://cdn.discordapp.com/embed/avatars/${
				parseInt(discord_user.discriminator) % 5
			}.png`;

	const statusColor = {
		online: "bg-green-500",
		idle: "bg-yellow-500",
		dnd: "bg-red-500",
		offline: "bg-gray-500",
	}[discord_status];

	const app = activities.find((a) => a.type === 0);

	const containerClass = isDarkMode
		? "bg-zinc-800 text-white"
		: "bg-white text-zinc-800";

	const cardClass = isDarkMode
		? "bg-zinc-700 text-zinc-200"
		: "bg-zinc-100 text-zinc-800";

	const borderClass = isDarkMode ? "border-zinc-600" : "border-zinc-300";

	const getDiscordAssetUrl = (
		appId: string | undefined,
		imageName: string | undefined,
		activityName?: string,
	): string | null => {
		if (!appId || !imageName) return null;

		// Handle Discord's external media proxy
		if (imageName.startsWith("mp:external/")) {
			const encodedUrl = imageName.replace("mp:external/", "");
			try {
				return decodeURIComponent(encodedUrl);
			} catch {
				return null;
			}
		}

		const cleanName = imageName
			.replace(/^(large_|small_)/, "")
			.replace(/\?.*$/, "");
		const cdnUrl = `https://cdn.discordapp.com/app-assets/${appId}/${cleanName}.png`;

		// Check for known fallback (e.g., Rider)
		const fallback = getDynamicFallback(activityName);
		return cdnUrl + `#fallback=${encodeURIComponent(fallback ?? "")}`;
	};

	const getDynamicFallback = (activityName?: string): string | null => {
		if (!activityName) return null;

		const key = activityName.toLowerCase().replace(/\s+/g, "_");

		const knownFallbacks: Record<string, string> = {
			jetbrains_rider:
				"https://raw.githubusercontent.com/Azn9/JetBrains-Discord-Integration/develop/icons/data/themes/material/applications/jetbrains_rider.png",
			rider:
				"https://raw.githubusercontent.com/Azn9/JetBrains-Discord-Integration/develop/icons/data/themes/material/applications/jetbrains_rider.png",
		};

		return (
			knownFallbacks[key] ||
			`https://raw.githubusercontent.com/Azn9/JetBrains-Discord-Integration/develop/icons/data/themes/material/applications/${key}.png`
		);
	};

	const largeImageUrl = getDiscordAssetUrl(
		app?.application_id,
		app?.assets?.large_image,
	);
	const smallImageUrl = getDiscordAssetUrl(
		app?.application_id,
		app?.assets?.small_image,
	);

	return (
		<div
			className={`p-4 rounded-2xl shadow-lg w-full max-w-md mx-auto m-4 ${containerClass}`}
		>
			<div className="flex items-center gap-4">
				<img
					src={avatarUrl}
					alt="Avatar"
					className={`w-16 h-16 rounded-full border-2 ${borderClass}`}
				/>
				<div>
					<div className="text-lg font-semibold">
						{discord_user.username}#{discord_user.discriminator}
					</div>
					<div className="flex items-center gap-2 text-sm text-zinc-400">
						<span className={`w-2 h-2 rounded-full ${statusColor}`}></span>
						<span className="capitalize">{discord_status}</span>
					</div>
				</div>
			</div>

			{app && (
				<div className={`mt-4 p-3 rounded-xl ${cardClass}`}>
					<div className="text-sm">🧩 Active App</div>
					<div className="text-lg font-semibold">{app.name}</div>
					{app.details && <div className="text-sm">{app.details}</div>}
					{app.state && <div className="text-sm">{app.state}</div>}

					{(largeImageUrl || smallImageUrl) && (
						<div className="flex items-center gap-3 mt-3">
							{(largeImageUrl || smallImageUrl) && (
								<div className="flex items-center gap-3 mt-3">
									{largeImageUrl && (
										<img
											src={largeImageUrl}
											alt={app.assets?.large_text || "Large Image"}
											title={app.assets?.large_text}
											className="w-16 h-16 rounded-md border"
											onError={(e) => {
												const target = e.currentTarget;
												if (!target) return;

												const fallback = new URL(target.src).hash.replace(
													"#fallback=",
													"",
												);
												if (fallback) target.src = decodeURIComponent(fallback);
											}}
										/>
									)}
									{smallImageUrl && (
										<img
											src={smallImageUrl}
											alt={app.assets?.small_text || "Small Image"}
											title={app.assets?.small_text}
											className="w-10 h-10 rounded-full border"
											onError={(e) => {
												const target = e.currentTarget;
												if (!target) return;

												const fallback = new URL(target.src).hash.replace(
													"#fallback=",
													"",
												);
												if (fallback) target.src = decodeURIComponent(fallback);
											}}
										/>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
};
