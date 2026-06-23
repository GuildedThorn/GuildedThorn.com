import { useEffect } from "react";
import { useAuth } from "@components/AuthContext";
import { sendWatchtimeHeartbeat } from "@backend/api";

const INTERVAL_SECONDS = 30;

// Accumulates per-user watchtime for an activity while `active` is true. No-op for
// logged-out visitors (only registered users have a profile to credit). Sends a
// heartbeat every 30s; the server clamps each call, so a missed/extra tick is
// harmless. The interval is keyed on (active, isAuthenticated) so it tears down
// cleanly when playback stops or the component unmounts.
export function useWatchtime(activity: "radio" | "stream", active: boolean) {
	const { isAuthenticated } = useAuth();

	useEffect(() => {
		if (!active || !isAuthenticated) return;
		const id = setInterval(() => {
			void sendWatchtimeHeartbeat(activity, INTERVAL_SECONDS);
		}, INTERVAL_SECONDS * 1000);
		return () => clearInterval(id);
	}, [activity, active, isAuthenticated]);
}
