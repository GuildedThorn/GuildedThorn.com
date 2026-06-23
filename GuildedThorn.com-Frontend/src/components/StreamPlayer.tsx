import { useEffect, useRef, useState } from "react";
import { RefreshCw, Video } from "lucide-react";

// Self-hosted live video, replacing the old third-party stream embed. On-air
// state is owned by the page (see useStreamStatus); this component just attaches
// HLS playback while live. The HLS playlist is reverse-proxied from Owncast at
// /stream/hls/stream.m3u8 — same-origin, so no third-party cookie/consent.
const HLS_URL = "/stream/hls/stream.m3u8";

function StreamPlayer({ online }: { online: boolean | null }) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [loading, setLoading] = useState(false);

	// Attach HLS while the stream is live; tear it down when it isn't.
	useEffect(() => {
		const video = videoRef.current;
		if (!video || online !== true) return;

		let destroyed = false;
		// hls.js is imported on demand so its ~150KB stays out of the page chunk
		// until someone actually opens a live stream.
		let hls: import("hls.js").default | null = null;

		const onWaiting = () => setLoading(true);
		const onPlaying = () => setLoading(false);
		video.addEventListener("waiting", onWaiting);
		video.addEventListener("playing", onPlaying);

		if (video.canPlayType("application/vnd.apple.mpegurl")) {
			// Safari / iOS play HLS natively — no MediaSource needed.
			video.src = HLS_URL;
		} else {
			setLoading(true);
			void import("hls.js").then(({ default: Hls }) => {
				if (destroyed) return;
				if (!Hls.isSupported()) {
					video.src = HLS_URL; // last resort: let the browser try
					return;
				}
				hls = new Hls({ lowLatencyMode: true });
				hls.loadSource(HLS_URL);
				hls.attachMedia(video);
				hls.on(Hls.Events.ERROR, (_event, data) => {
					// Fatal usually means the broadcaster dropped; stop the spinner
					// and let the status poll flip the page back to offline.
					if (data.fatal) {
						hls?.destroy();
						hls = null;
						setLoading(false);
					}
				});
			});
		}

		return () => {
			destroyed = true;
			video.removeEventListener("waiting", onWaiting);
			video.removeEventListener("playing", onPlaying);
			hls?.destroy();
			video.removeAttribute("src");
			video.load();
		};
	}, [online]);

	if (online !== true) {
		return (
			<div className="flex aspect-video flex-col items-center justify-center gap-3 bg-muted/40 p-10 text-center">
				<Video className="text-muted-foreground" size={32} />
				<p className="max-w-sm text-sm text-muted-foreground">
					{online === null
						? "Checking if the stream is live…"
						: "Stream is offline. Check back soon!"}
				</p>
			</div>
		);
	}

	return (
		<div className="relative aspect-video bg-black">
			{/* biome-ignore lint/a11y/useMediaCaption: live broadcast has no caption track */}
			<video
				ref={videoRef}
				className="h-full w-full"
				controls
				autoPlay
				muted
				playsInline
			/>
			<span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-destructive px-2 py-0.5 text-xs font-semibold text-white">
				<span className="h-2 w-2 animate-pulse rounded-full bg-white" />
				LIVE
			</span>
			{loading && (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white">
					<RefreshCw className="animate-spin" size={32} />
				</div>
			)}
		</div>
	);
}

export default StreamPlayer;
