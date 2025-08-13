import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { FaQuestion, FaScroll, FaStream } from "react-icons/fa";
import { PiNetwork } from "react-icons/pi";
import { FaRadio } from "react-icons/fa6";

export default function NavBar() {
	const [menuOpen, setMenuOpen] = useState(false);

	const navItems = [
		{ to: "/stream", label: "Stream", icon: <FaStream className="inline-block mr-1 text-lg" /> },
		{ to: "/net", label: "Network", icon: <PiNetwork className="inline-block mr-1 text-lg" /> },
		{ to: "/blog/pages", label: "Blog", icon: <FaScroll className="inline-block mr-1 text-lg" /> },
		{ to: "/radio", label: "Radio", icon: <FaRadio className="inline-block mr-1 text-lg" /> },
		{ to: "/guestbook", label: "Guestbook", icon: <FaQuestion className="inline-block mr-1 text-lg" /> },
		{ to: "/contact", label: "Contact", icon: <FaQuestion className="inline-block mr-1 text-lg" /> },
	];

	return (
		<nav className="bg-white shadow-md dark:bg-gray-900 dark:shadow-gray-800">
			<div className="mx-auto px-6 flex justify-between items-center h-16">
				{/* Left: Logo & brand */}
				<Link to="/" className="flex-shrink-0 flex items-center space-x-2">
					<img src="/images/Logo.svg" alt="MineCloud Logo" className="h-12 w-12" />
					<span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight max-[290px]:hidden">
    GuildedThorn
  </span>
				</Link>


				{/* Right: Links & hamburger */}
				<div className="flex items-center">
					{/* Desktop links */}
					<div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
						{navItems.map((item) => (
							<Link key={item.to} to={item.to} className="nav-link inline-flex items-center">
								{item.icon}
								{item.label}
							</Link>
						))}
					</div>

					{/* Hamburger button */}
					<button
						onClick={() => setMenuOpen(!menuOpen)}
						className="lg:hidden ml-2 text-gray-700 dark:text-gray-300 focus:outline-none"
						aria-label="Toggle navigation menu"
					>
						{menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
					</button>
				</div>
			</div>

			{/* Mobile menu */}
			{menuOpen && (
				<div className="lg:hidden px-6 pb-4">
					<div className="flex flex-col space-y-2">
						{navItems.map((item) => (
							<Link
								key={item.to}
								to={item.to}
								className="nav-link"
								onClick={() => setMenuOpen(false)}
							>
								{item.label}
							</Link>
						))}
					</div>
				</div>
			)}
		</nav>
	);
}
