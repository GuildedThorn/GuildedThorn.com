import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@components/ui/ThemeToggle";

beforeEach(() => {
	localStorage.clear();
	document.documentElement.style.colorScheme = "";
});

describe("ThemeToggle", () => {
	it("cycles system → light → dark → system and persists each choice", async () => {
		const user = userEvent.setup();
		render(<ThemeToggle />);
		const btn = screen.getByRole("button");

		expect(btn.getAttribute("aria-label")).toMatch(/system/i);

		await user.click(btn);
		expect(btn.getAttribute("aria-label")).toMatch(/light/i);
		expect(localStorage.getItem("theme")).toBe("light");

		await user.click(btn);
		expect(btn.getAttribute("aria-label")).toMatch(/dark/i);
		expect(localStorage.getItem("theme")).toBe("dark");

		await user.click(btn);
		expect(localStorage.getItem("theme")).toBe("system");
	});
});
