import { Outlet } from "react-router-dom";

import NavBar from "@components/ui/NavBar.tsx";
import OwnerBar from "@components/ui/OwnerBar.tsx";
import Footer from "@components/ui/Footer.tsx";
import CookieConsent from "@components/CookieConsent.tsx";
import RadioLiveToast from "@components/RadioLiveToast.tsx";
import MiniPlayer from "@components/MiniPlayer.tsx";
import PomodoroMini from "@components/PomodoroMini.tsx";


export default function MainLayout() {
    return (
        <div className="flex min-h-dvh flex-col bg-background text-foreground">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:font-medium focus:text-primary-foreground focus:shadow"
            >
                Skip to content
            </a>

            <header className="print:hidden">
                <NavBar />
                <OwnerBar />
            </header>

            <main
                id="main-content"
                tabIndex={-1}
                className="flex-grow scroll-mt-20 focus:outline-none"
            >
                <Outlet />
            </main>

            <Footer />
            <CookieConsent />
            <RadioLiveToast />
            <MiniPlayer />
            <PomodoroMini />
        </div>
    );
}
