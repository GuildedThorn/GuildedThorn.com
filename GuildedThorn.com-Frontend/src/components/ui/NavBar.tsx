import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, LogOut, LogIn, UserPlus } from "lucide-react";
import { FaBook, FaCode, FaEnvelope, FaImages, FaScroll, FaStream, FaTools } from "react-icons/fa";
import { PiNetwork } from "react-icons/pi";
import { FaRadio } from "react-icons/fa6";
import { cn } from "@lib/utils";
import { useAuth } from "@components/AuthContext";
import { Avatar } from "@components/ui/Avatar";
import { ThemeToggle } from "@components/ui/ThemeToggle";
import { logout } from "@backend/api";

export default function NavBar() {
	const [menuOpen, setMenuOpen] = useState(false);
	const { isAuthenticated, user, loading, refresh } = useAuth();

	const navItems = [
		{ to: "/projects", label: "Projects", icon: <FaCode className="text-base" /> },
		{ to: "/stream", label: "Stream", icon: <FaStream className="text-base" /> },
		{ to: "/net", label: "Network", icon: <PiNetwork className="text-base" /> },
		{ to: "/gallery/images/", label: "Gallery", icon: <FaImages className="text-base" /> },
		{ to: "/blog/pages", label: "Blog", icon: <FaScroll className="text-base" /> },
		{ to: "/radio", label: "Radio", icon: <FaRadio className="text-base" /> },
		{ to: "/guestbook", label: "Guestbook", icon: <FaBook className="text-base" /> },
		{ to: "/tools", label: "Tools", icon: <FaTools className="text-base" /> },
		{ to: "/contact", label: "Contact", icon: <FaEnvelope className="text-base" /> },
	];

	const closeMenu = () => setMenuOpen(false);

	const handleLogout = async () => {
		await logout();
		await refresh();
		closeMenu();
	};

	const navLinkClass = ({ isActive }: { isActive: boolean }) =>
		cn("nav-link", isActive && "bg-muted text-primary");

	const authLinks = loading ? null : isAuthenticated ? (
		<>
			<Link to="/settings" className="nav-link min-w-0 max-w-[12rem]" onClick={closeMenu}>
				<Avatar src={user?.avatarUrl} name={user?.name} className="h-6 w-6 shrink-0 text-[10px]" />
				<span className="truncate">{user?.name || "Account"}</span>
			</Link>
			<button onClick={handleLogout} className="nav-link">
				<LogOut className="h-4 w-4 text-destructive" />
				Logout
			</button>
		</>
	) : (
		<>
			<Link to="/login" className="nav-link" onClick={closeMenu}>
				<LogIn className="h-4 w-4" />
				Login
			</Link>
			<Link
				to="/register"
				onClick={closeMenu}
				className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm
					font-medium text-primary-foreground transition-colors hover:bg-primary/90
					focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<UserPlus className="h-4 w-4" />
				Register
			</Link>
		</>
	);

	return (
		<div className="sticky top-0 z-40 px-3 pt-3">
			<nav className="mx-auto max-w-7xl rounded-2xl border border-border bg-card/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70">
				<div className="flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
					{/* Brand */}
					<Link to="/" className="flex shrink-0 items-center gap-2" onClick={closeMenu}>
						<img src="/images/Logo.svg" alt="GuildedThorn logo" className="h-10 w-10" />
						<span className="text-xl font-extrabold tracking-tight text-primary max-[360px]:hidden">
							GuildedThorn
						</span>
					</Link>

					{/* Desktop: nav links + auth (only when there's room for the full row) */}
					<div className="hidden items-center gap-1 xl:flex">
						{navItems.map((item) => (
							<NavLink key={item.to} to={item.to} className={navLinkClass}>
								{item.icon}
								{item.label}
							</NavLink>
						))}
						<span className="mx-1 h-6 w-px bg-border" />
						{authLinks}
						<ThemeToggle />
					</div>

					{/* Mobile: hamburger */}
					<button
						onClick={() => setMenuOpen(!menuOpen)}
						className="rounded-lg p-2 text-foreground/80 transition-colors hover:bg-muted
							focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:hidden"
						aria-label="Toggle navigation menu"
						aria-expanded={menuOpen}
					>
						{menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
					</button>
				</div>

				{/* Mobile menu */}
				{menuOpen && (
					<div className="border-t border-border px-3 pb-3 pt-2 xl:hidden">
						<div className="flex flex-col gap-1">
							{navItems.map((item) => (
								<NavLink
									key={item.to}
									to={item.to}
									className={({ isActive }) =>
										cn("nav-link w-full", isActive && "bg-muted text-primary")
									}
									onClick={closeMenu}
								>
									{item.icon}
									{item.label}
								</NavLink>
							))}
							<span className="my-2 h-px bg-border" />
							{authLinks}
							<ThemeToggle className="w-full" />
						</div>
					</div>
				)}
			</nav>
		</div>
	);
}
