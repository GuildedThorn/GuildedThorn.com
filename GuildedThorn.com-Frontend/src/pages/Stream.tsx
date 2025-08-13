import { useEffect } from "react";

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
				// @ts-ignore
				new window.Twitch.Embed("twitch-embed", {
					width: "100%",
					height: 480,
					channel: "xGuildedThorn",
					parent: ["localhost", "guildedthorn.com"],
				});
			};
		} else {
			// @ts-ignore
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
	return (
		<>
			<div className="mb-4 ps-2 lg:mb-0 lg:pe-1 lg:ps-0 py-8">
				<h1>xGuildedThorn</h1>
				<div className="twitch-embed">
					<Twitch />
				</div>
				<p className="text-lg font-semibold mb-2">
					Check out my stream schedule!
				</p>
				<a
					href="https://www.twitch.tv/xGuildedThorn/schedule"
					target="_blank"
					rel="noopener noreferrer"
					className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
				>
					View Schedule on Twitch
				</a>
			</div>
		</>
	);
};

export default Stream;
