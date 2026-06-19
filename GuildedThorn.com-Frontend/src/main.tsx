import "@styles/index.css";

import AppRoutes from "@routes/AppRoutes";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "@components/ErrorBoundary";
import {AuthProvider} from "@components/AuthContext.tsx";
import { ConsentProvider } from "@components/ConsentContext";
import { RadioPlayerProvider } from "@components/RadioPlayerContext";
import { PomodoroProvider } from "@components/PomodoroContext";

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
                        <BrowserRouter>
                            <AppRoutes />
                        </BrowserRouter>
                    </PomodoroProvider>
                </RadioPlayerProvider>
            </ConsentProvider>
        </AuthProvider>
    </ErrorBoundary>
);
