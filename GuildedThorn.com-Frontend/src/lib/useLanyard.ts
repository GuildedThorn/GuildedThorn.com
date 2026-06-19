import { useEffect, useState } from "react";

export interface LanyardActivity {
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

export interface LanyardSpotify {
    track_id: string | null;
    song: string;
    artist: string;
    album: string;
    album_art_url: string | null;
}

export interface LanyardPresence {
    discord_user: {
        username: string;
        discriminator: string;
        avatar: string | null;
        id: string;
    };
    discord_status: "online" | "idle" | "dnd" | "offline";
    activities: LanyardActivity[];
    listening_to_spotify: boolean;
    spotify: LanyardSpotify | null;
}

/**
 * Live Lanyard presence over WebSocket. Handles the subscribe handshake,
 * the required heartbeat (Lanyard drops silent connections), and
 * auto-reconnect, then pushes every PRESENCE_UPDATE into state.
 */
export function useLanyard(userId: string): LanyardPresence | null {
    const [presence, setPresence] = useState<LanyardPresence | null>(null);

    useEffect(() => {
        let ws: WebSocket | null = null;
        let heartbeat: ReturnType<typeof setInterval> | undefined;
        let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
        let disposed = false;

        const connect = () => {
            ws = new WebSocket("wss://api.lanyard.rest/socket");

            ws.onmessage = (event) => {
                const { op, t, d } = JSON.parse(event.data);

                if (op === 1) {
                    // Hello: subscribe, then heartbeat at the server-given interval
                    ws?.send(JSON.stringify({ op: 2, d: { subscribe_to_id: userId } }));
                    clearInterval(heartbeat);
                    heartbeat = setInterval(() => {
                        ws?.send(JSON.stringify({ op: 3 }));
                    }, d?.heartbeat_interval ?? 30_000);
                } else if (t === "INIT_STATE" || t === "PRESENCE_UPDATE") {
                    setPresence(d);
                }
            };

            ws.onclose = () => {
                clearInterval(heartbeat);
                if (!disposed) {
                    reconnectTimer = setTimeout(connect, 5_000);
                }
            };
        };

        connect();

        return () => {
            disposed = true;
            clearInterval(heartbeat);
            clearTimeout(reconnectTimer);
            ws?.close();
        };
    }, [userId]);

    return presence;
}
