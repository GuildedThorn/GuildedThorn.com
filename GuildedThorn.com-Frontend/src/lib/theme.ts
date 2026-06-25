/* Theme preference: "system" follows the OS (the default), while "light" /
   "dark" force a scheme by overriding `color-scheme` on <html>, which is what
   drives every light-dark() token in the stylesheet. The choice is persisted to
   localStorage and applied as the JS bundle loads (see main.tsx); this module
   keeps the React UI in sync. */

export type Theme = "light" | "dark" | "system";

export const THEME_KEY = "theme";

export function getStoredTheme(): Theme {
	try {
		const t = localStorage.getItem(THEME_KEY);
		if (t === "light" || t === "dark" || t === "system") return t;
	} catch {
		/* localStorage unavailable */
	}
	return "system";
}

export function applyTheme(theme: Theme) {
	document.documentElement.style.colorScheme =
		theme === "system" ? "light dark" : theme;
}

export function setTheme(theme: Theme) {
	try {
		localStorage.setItem(THEME_KEY, theme);
	} catch {
		/* ignore */
	}
	applyTheme(theme);
}
