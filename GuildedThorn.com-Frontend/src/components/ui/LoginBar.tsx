import { Link } from "react-router-dom";
import { useAuth } from "@components/AuthContext";
import { logout } from "@backend/api.ts";
import { SettingsIcon } from "lucide-react";
import { FaSignInAlt, FaSignOutAlt, FaUserPlus } from "react-icons/fa";

export default function LoginBar() {
    const { isAuthenticated, user, loading, refresh } = useAuth();

    const handleLogout = async () => {
        await logout();
        await refresh();
    };

    if (loading) {
        return (
            <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="mx-auto h-12 px-6 flex items-center justify-end text-sm text-gray-500 dark:text-gray-400">
                    Checking authentication...
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="mx-auto h-auto px-6 py-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                {isAuthenticated ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                        <span className="text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            Welcome, {user?.name || "undefined"}!
                        </span>
                        <Link
                            to="/settings"
                            className="nav-link inline-flex items-center gap-1"
                        >
                            <SettingsIcon className="w-4 h-4" />
                            User Settings
                        </Link>
                        <button onClick={handleLogout} className="nav-link inline-flex items-center gap-1">
                            <FaSignOutAlt className="w-4 h-4 text-red-600 dark:text-red-400" />
                            Logout
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                        <Link to="/login" className="nav-link inline-flex items-center gap-1">
                            <FaSignInAlt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            Login
                        </Link>
                        <Link to="/register" className="nav-link inline-flex items-center gap-1">
                            <FaUserPlus className="w-4 h-4 text-green-600 dark:text-green-400" />
                            Register
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
