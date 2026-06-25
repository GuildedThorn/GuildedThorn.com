import "@styles/index.css";

import { router } from "@routes/AppRoutes";
import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "@components/ErrorBoundary";
import {AuthProvider} from "@components/AuthContext.tsx";
import { ConsentProvider } from "@components/ConsentContext";
import { RadioPlayerProvider } from "@components/RadioPlayerContext";
import { PomodoroProvider } from "@components/PomodoroContext";
import { applyTheme, getStoredTheme } from "@lib/theme";

// Apply the saved theme as the bundle loads (replaces the old render-blocking
// /theme-init.js). "system" is a no-op over the CSS default, so only forced
// light/dark users could see a brief flash before this runs.
applyTheme(getStoredTheme());

// Register the service worker that delivers "going live" Web Push notifications.
// Harmless if the browser doesn't support it; the opt-in UI gates the rest.
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
            console.warn("Service worker registration failed", err);
        });
    });
}

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <AuthProvider>
            <ConsentProvider>
                <RadioPlayerProvider>
                    <PomodoroProvider>
                        <Suspense
                            fallback={
                                <div className="flex min-h-[60vh] items-center justify-center">
                                    <div
                                        className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"
                                        role="status"
                                        aria-label="Loading"
                                    />
                                </div>
                            }
                        >
                            <RouterProvider router={router} />
                        </Suspense>
                    </PomodoroProvider>
                </RadioPlayerProvider>
            </ConsentProvider>
        </AuthProvider>
    </ErrorBoundary>
);
