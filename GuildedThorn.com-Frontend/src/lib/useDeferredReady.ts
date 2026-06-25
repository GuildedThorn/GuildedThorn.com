import { useEffect, useState } from "react";

type IdleWindow = Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
};

/**
 * Returns false on first render, then flips to true once the page has loaded
 * and the browser is idle. Use it to keep non-critical, off-screen work — the
 * cookie banner, realtime toast sockets, etc. — out of the initial render and
 * LCP window so it doesn't compete with above-the-fold paint.
 */
export function useDeferredReady(): boolean {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const w = window as IdleWindow;
        let idleHandle: number | undefined;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const schedule = () => {
            if (w.requestIdleCallback) {
                idleHandle = w.requestIdleCallback(() => setReady(true), { timeout: 2000 });
            } else {
                timer = setTimeout(() => setReady(true), 200);
            }
        };

        if (document.readyState === "complete") {
            schedule();
        } else {
            window.addEventListener("load", schedule, { once: true });
        }

        return () => {
            window.removeEventListener("load", schedule);
            if (timer) clearTimeout(timer);
            if (idleHandle !== undefined && w.cancelIdleCallback) w.cancelIdleCallback(idleHandle);
        };
    }, []);

    return ready;
}
