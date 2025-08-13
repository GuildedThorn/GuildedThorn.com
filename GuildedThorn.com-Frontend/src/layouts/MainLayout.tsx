import { Outlet } from "react-router-dom";

import NavBar from "@components/ui/NavBar.tsx";
import LoginBar from "@components/ui/LoginBar.tsx";


export default function MainLayout() {
    return (
        <div className="flex flex-col bg-white text-gray-800 dark:bg-gray-900 dark:text-white">
            <header>
                <NavBar />
                <LoginBar />
            </header>

            <main className="flex-grow">
                <div className="mx-auto">
                    <Outlet />
                </div>
            </main>

            <footer className="text-center p-1 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div>&copy; {new Date().getFullYear()} GuildedThorn. All rights reserved |  Made with react and love</div>
            </footer>
        </div>
    );
}
