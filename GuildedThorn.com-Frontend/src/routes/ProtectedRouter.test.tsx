import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRouter from "@routes/ProtectedRouter";

// Mock the auth hook so we can drive ProtectedRouter's three states directly.
// vi.hoisted keeps the mock fn available inside the hoisted vi.mock factory.
const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));
vi.mock("@components/AuthContext", () => ({ useAuth: () => useAuthMock() }));

function renderProtected(auth: { isAuthenticated: boolean; loading: boolean }) {
	useAuthMock.mockReturnValue({ user: null, refresh: vi.fn(), ...auth });
	return render(
		<MemoryRouter initialEntries={["/secret"]}>
			<Routes>
				<Route element={<ProtectedRouter />}>
					<Route path="/secret" element={<div>secret content</div>} />
				</Route>
				<Route path="/login" element={<div>login page</div>} />
			</Routes>
		</MemoryRouter>,
	);
}

describe("ProtectedRouter", () => {
	beforeEach(() => useAuthMock.mockReset());

	it("renders the protected route when authenticated", () => {
		renderProtected({ isAuthenticated: true, loading: false });
		expect(screen.getByText("secret content")).toBeTruthy();
		expect(screen.queryByText("login page")).toBeNull();
	});

	it("redirects to /login when unauthenticated", () => {
		renderProtected({ isAuthenticated: false, loading: false });
		expect(screen.getByText("login page")).toBeTruthy();
		expect(screen.queryByText("secret content")).toBeNull();
	});

	it("renders nothing while auth is still loading", () => {
		renderProtected({ isAuthenticated: false, loading: true });
		expect(screen.queryByText("secret content")).toBeNull();
		expect(screen.queryByText("login page")).toBeNull();
	});
});
