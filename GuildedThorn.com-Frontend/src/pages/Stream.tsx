import { useEffect } from "react";
import { Button } from "@components/ui/Button";
import { useConsent } from "@components/ConsentContext";

declare global {
	interface Window {
		Twitch: {
			Embed: new (id: string, options: Record<string, unknown>) => unknown;
		};
	}
}

const Twitch = () => {
	useEffect(() => {
		// Check if the script is already added
		if (!document.getElementById("twitch-embed-script")) {
			const script = document.createElement("script");
			script.setAttribute("id", "twitch-embed-script");
			script.setAttribute("src", "https://embed.twitch.tv/embed/v1.js");
			script.setAttribute("async", "");
			document.body.appendChild(script);

			script.onload = () => {
				new window.Twitch.Embed("twitch-embed", {
					width: "100%",
					height: 480,
					channel: "xGuildedThorn",
					parent: ["localhost", "guildedthorn.com"],
				});
			};
		} else {
			new window.Twitch.Embed("twitch-embed", {
				width: "100%",
				height: 480,
				channel: "xGuildedThorn",
				parent: ["localhost", "guildedthorn.com"],
			});
		}
	}, []);

	return <div id="twitch-embed"></div>;
};

const Stream = () => {
	const { functional, openSettings } = useConsent();

	return (
		<div className="page">
			<h1 className="mb-4 text-3xl font-bold tracking-tight">xGuildedThorn</h1>
			<div className="overflow-hidden rounded-2xl border border-border shadow-sm">
				{functional ? (
					<Twitch />
				) : (
					<div className="flex flex-col items-center gap-3 bg-muted/40 p-10 text-center">
						<p className="max-w-sm text-sm text-muted-foreground">
							The Twitch stream is third-party content that may set its own cookies.
							Enable third-party content to watch it here.
						</p>
						<Button size="sm" onClick={openSettings}>
							Cookie settings
						</Button>
					</div>
				)}
			</div>
			<p className="mb-2 mt-6 text-lg font-semibold">
				Check out my stream schedule!
			</p>
			<a
				href="https://www.twitch.tv/xGuildedThorn/schedule"
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 font-medium
					text-white shadow-sm transition-colors hover:bg-purple-700 hover:text-white
					focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
			>
				View Schedule on Twitch
			</a>
		</div>
	);
};

export default Stream;
