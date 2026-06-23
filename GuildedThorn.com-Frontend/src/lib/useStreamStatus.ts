import { useEffect, useState } from "react";

// Polls the self-hosted stream's on-air state. The backend reverse-proxies
// Owncast's /api/status verbatim at /stream/status, so the field names below
// are Owncast's. Shared by the Stream page header and the player so there's a
// single poll, not one per consumer.
const STATUS_URL = "/stream/status";

interface OwncastStatus {
	online: boolean;
	viewerCount?: number;
	streamTitle?: string;
}

export interface StreamStatus {
	/** null until the first poll resolves (so the UI can show "Checking…"). */
	online: boolean | null;
	viewers: number;
	title: string;
}

export function useStreamStatus(): StreamStatus {
	const [online, setOnline] = useState<boolean | null>(null);
	const [viewers, setViewers] = useState(0);
	const [title, setTitle] = useState("");

	useEffect(() => {
		let active = true;
		const check = async () => {
			// Don't poll a backgrounded tab — same as the radio's status poll.
			if (typeof document !== "undefined" && document.hidden) return;
			try {
				const res = await fetch(STATUS_URL, { cache: "no-store" });
				if (!res.ok) throw new Error(`status ${res.status}`);
				const data = (await res.json()) as OwncastStatus;
				if (!active) return;
				setOnline(data.online);
				if (typeof data.viewerCount === "number") setViewers(data.viewerCount);
				setTitle(data.online ? data.streamTitle ?? "" : "");
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

	return { online, viewers, title };
}
