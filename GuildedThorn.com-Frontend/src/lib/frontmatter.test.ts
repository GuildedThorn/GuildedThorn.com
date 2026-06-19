import { describe, it, expect } from "vitest";
import { stripFrontmatter, parseTags } from "./frontmatter";

const withFm = "---\ntags: security, homelab\n---\nHello body";

describe("stripFrontmatter", () => {
	it("removes a leading frontmatter block", () => {
		expect(stripFrontmatter(withFm)).toBe("Hello body");
	});

	it("leaves content without frontmatter untouched", () => {
		expect(stripFrontmatter("just text")).toBe("just text");
	});

	it("handles undefined", () => {
		expect(stripFrontmatter(undefined)).toBe("");
	});
});

describe("parseTags", () => {
	it("parses a comma list", () => {
		expect(parseTags(withFm)).toEqual(["security", "homelab"]);
	});

	it("parses a bracketed/quoted array", () => {
		expect(parseTags('---\ntags: ["x", y]\n---\nbody')).toEqual(["x", "y"]);
	});

	it("returns [] when there's no frontmatter", () => {
		expect(parseTags("no frontmatter here")).toEqual([]);
	});
});
