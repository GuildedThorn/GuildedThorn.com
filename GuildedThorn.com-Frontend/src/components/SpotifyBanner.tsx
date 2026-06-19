import { FaSpotify } from "react-icons/fa";
import { useLanyard } from "@lib/useLanyard";

const userId = "654849939175768074";
const spotifyProfileLink =
	"https://open.spotify.com/user/lint74q8j4m2mq36z3wyt2obt";

/**
 * Real-time "now playing" banner driven by the Lanyard WebSocket (same
 * source as the Discord widget). Updates the moment a track changes;
 * links to the Spotify profile while idle.
 */
export default function SpotifyBanner() {
	const presence = useLanyard(userId);
	const spotify = presence?.listening_to_spotify ? presence.spotify : null;

	const listening = spotify !== null && spotify !== undefined;
	const href = listening && spotify.track_id
		? `https://open.spotify.com/track/${spotify.track_id}`
		: spotifyProfileLink;

	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="group mx-auto mt-4 flex w-full max-w-md items-center gap-4 rounded-xl
				border border-border bg-muted/50 p-4 text-left shadow-sm transition-all
				hover:-translate-y-0.5 hover:shadow-md"
		>
			{listening && spotify.album_art_url ? (
				<img
					src={spotify.album_art_url}
					alt={spotify.album}
					className="h-16 w-16 shrink-0 rounded-lg object-cover shadow-sm"
				/>
			) : (
				<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
					<FaSpotify className="h-8 w-8 text-success" />
				</div>
			)}

			<div className="min-w-0">
				<p className="flex items-center gap-1.5 text-xs font-medium text-success">
					<FaSpotify className="h-3.5 w-3.5" />
					{listening ? "Now playing on Spotify" : "Spotify"}
				</p>
				<p className="truncate font-semibold group-hover:text-primary">
					{listening ? spotify.song : "Not playing right now"}
				</p>
				<p className="truncate text-sm text-muted-foreground">
					{listening ? spotify.artist : "Check out my profile"}
				</p>
			</div>
		</a>
	);
}
