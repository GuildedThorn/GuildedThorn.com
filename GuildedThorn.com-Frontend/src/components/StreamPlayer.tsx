import { useEffect, useRef, useState } from "react";
import { RefreshCw, Users, Video } from "lucide-react";

// Self-hosted live video, replacing the old third-party stream embed. The backend reverse-
// proxies an Owncast (RTMP→HLS media server) instance:
//   /stream/status          → Owncast /api/status ({ online, viewerCount, streamTitle })
//   /stream/hls/stream.m3u8 → the live HLS playlist
// Everything is same-origin, so there's no third-party cookie/consent concern.
const HLS_URL = "/stream/hls/stream.m3u8";
const STATUS_URL = "/stream/status";

// Field names match Owncast's /api/status response (proxied verbatim).
interface StreamStatus {
	online: boolean;
	viewerCount?: number;
	streamTitle?: string;
}

function StreamPlayer() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [online, setOnline] = useState<boolean | null>(null);
	const [viewers, setViewers] = useState(0);
	const [title, setTitle] = useState("");
	const [loading, setLoading] = useState(false);

	// Poll on-air state + viewer count (skip while the tab is hidden) — same
	// shape and cadence as the radio's status poll.
	useEffect(() => {
		let active = true;
		const check = async () => {
			if (typeof document !== "undefined" && document.hidden) return;
			try {
				const res = await fetch(STATUS_URL, { cache: "no-store" });
				if (!res.ok) throw new Error(`status ${res.status}`);
				const data = (await res.json()) as StreamStatus;
				if (!active) return;
				setOnline(data.online);
				if (typeof data.viewerCount === "number") setViewers(data.viewerCount);
				if (data.online && data.streamTitle) setTitle(data.streamTitle);
			} catch {
				if (active) setOnline(false);
			}
		};
		check();
		const id = setInterval(check, 12000);
		return () => {
			active = false;
			clearInterval(id);
		};
	}, []);

	// Attach HLS playback while the stream is live; tear it down when it isn't.
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
					// A fatal error usually means the broadcaster dropped; let the
					// status poll flip us back to the offline card.
					if (data.fatal) {
						hls?.destroy();
						hls = null;
						setOnline(false);
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
					{online === null ? "Checking if the stream is live…" : "Stream is offline. Check back soon!"}
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
			<div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
				<span className="flex items-center gap-1.5 rounded-md bg-destructive px-2 py-0.5 text-xs font-semibold text-white">
					<span className="h-2 w-2 animate-pulse rounded-full bg-white" />
					LIVE
				</span>
				<span className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
					<Users size={12} />
					{viewers}
				</span>
				{title && (
					<span className="max-w-[14rem] truncate rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
						{title}
					</span>
				)}
			</div>
			{loading && (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white">
					<RefreshCw className="animate-spin" size={32} />
				</div>
			)}
		</div>
	);
}

export default StreamPlayer;
