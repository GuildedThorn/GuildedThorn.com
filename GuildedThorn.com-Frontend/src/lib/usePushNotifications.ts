import { useCallback, useEffect, useState } from "react";
import { getVapidPublicKey, subscribePush, unsubscribePush } from "@backend/api";

// VAPID public keys are sent over the wire as base64url; the PushManager wants
// the raw bytes as a Uint8Array.
// Return type pinned to Uint8Array<ArrayBuffer> (not the default ArrayBufferLike)
// so it satisfies BufferSource for PushManager.subscribe under TS 6's generic
// typed arrays.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

export function usePushNotifications() {
    const [subscribed, setSubscribed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reflect whatever subscription state the browser already has.
    useEffect(() => {
        if (!supported) return;
        navigator.serviceWorker.ready
            .then((reg) => reg.pushManager.getSubscription())
            .then((sub) => setSubscribed(!!sub))
            .catch(() => {});
    }, []);

    const subscribe = useCallback(async () => {
        if (!supported) return;
        setBusy(true);
        setError(null);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                setError("Notifications were blocked. Enable them in your browser settings.");
                return;
            }
            const reg = await navigator.serviceWorker.ready;
            const key = await getVapidPublicKey();
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(key),
            });
            await subscribePush(sub);
            setSubscribed(true);
        } catch (err) {
            console.error("Push subscribe failed", err);
            setError("Couldn't enable notifications. Please try again.");
        } finally {
            setBusy(false);
        }
    }, []);

    const unsubscribe = useCallback(async () => {
        if (!supported) return;
        setBusy(true);
        setError(null);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await unsubscribePush(sub.endpoint);
                await sub.unsubscribe();
            }
            setSubscribed(false);
        } catch (err) {
            console.error("Push unsubscribe failed", err);
            setError("Couldn't disable notifications. Please try again.");
        } finally {
            setBusy(false);
        }
    }, []);

    return { supported, subscribed, busy, error, subscribe, unsubscribe };
}
