// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { getStoredTheme, applyTheme, setTheme, THEME_KEY } from "./theme";

beforeEach(() => {
	localStorage.clear();
	document.documentElement.style.colorScheme = "";
});

describe("getStoredTheme", () => {
	it("defaults to 'system' when nothing is stored", () => {
		expect(getStoredTheme()).toBe("system");
	});

	it("returns a valid stored value", () => {
		localStorage.setItem(THEME_KEY, "dark");
		expect(getStoredTheme()).toBe("dark");
	});

	it("falls back to 'system' for an invalid value", () => {
		localStorage.setItem(THEME_KEY, "purple");
		expect(getStoredTheme()).toBe("system");
	});
});

describe("applyTheme", () => {
	it("forces color-scheme for light/dark", () => {
		applyTheme("light");
		expect(document.documentElement.style.colorScheme).toBe("light");
		applyTheme("dark");
		expect(document.documentElement.style.colorScheme).toBe("dark");
	});

	it("uses 'light dark' for system (follow the OS)", () => {
		applyTheme("system");
		expect(document.documentElement.style.colorScheme).toBe("light dark");
	});
});

describe("setTheme", () => {
	it("persists the choice and applies it", () => {
		setTheme("dark");
		expect(localStorage.getItem(THEME_KEY)).toBe("dark");
		expect(document.documentElement.style.colorScheme).toBe("dark");
	});
});
