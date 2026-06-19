import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
	it("joins class names", () => {
		expect(cn("a", "b")).toBe("a b");
	});

	it("lets the last conflicting Tailwind utility win", () => {
		expect(cn("px-2", "px-4")).toBe("px-4");
		expect(cn("p-4", "p-6")).toBe("p-6");
	});

	it("ignores falsy values", () => {
		expect(cn("a", false, null, undefined, "b")).toBe("a b");
	});

	it("returns an empty string with no inputs", () => {
		expect(cn()).toBe("");
	});
});
