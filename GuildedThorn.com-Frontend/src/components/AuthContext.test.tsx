import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "@components/AuthContext";

function Probe() {
	const { isAuthenticated, user, loading } = useAuth();
	if (loading) return <div>loading</div>;
	return <div>{isAuthenticated ? `auth:${user?.name}` : "anon"}</div>;
}

afterEach(() => vi.unstubAllGlobals());

describe("AuthProvider", () => {
	it("hydrates as authenticated when /me returns 200", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ name: "thorn", role: "owner" }),
			}),
		);
		render(
			<AuthProvider>
				<Probe />
			</AuthProvider>,
		);
		expect(await screen.findByText("auth:thorn")).toBeTruthy();
	});

	it("stays anonymous when /me returns 401", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
		render(
			<AuthProvider>
				<Probe />
			</AuthProvider>,
		);
		expect(await screen.findByText("anon")).toBeTruthy();
	});

	it("stays anonymous when the request throws", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
		render(
			<AuthProvider>
				<Probe />
			</AuthProvider>,
		);
		expect(await screen.findByText("anon")).toBeTruthy();
	});
});
