import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@lib/utils";
import { type Theme, getStoredTheme, setTheme } from "@lib/theme";

const ORDER: Theme[] = ["light", "dark", "system"];
const META: Record<Theme, { icon: typeof Sun; label: string }> = {
	light: { icon: Sun, label: "Light" },
	dark: { icon: Moon, label: "Dark" },
	system: { icon: Monitor, label: "System" },
};

/* Cycles light → dark → system. Icon-only in the desktop nav row, with a label
   in the mobile menu. */
export function ThemeToggle({ className }: { className?: string }) {
	const [theme, setThemeState] = useState<Theme>("system");

	useEffect(() => setThemeState(getStoredTheme()), []);

	const cycle = () => {
		const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
		setThemeState(next);
		setTheme(next);
	};

	const { icon: Icon, label } = META[theme];

	return (
		<button
			onClick={cycle}
			className={cn("nav-link", className)}
			title={`Theme: ${label} — click to change`}
			aria-label={`Theme: ${label}. Click to change.`}
		>
			<Icon className="h-4 w-4" />
			<span className="xl:hidden">{label} theme</span>
		</button>
	);
}
