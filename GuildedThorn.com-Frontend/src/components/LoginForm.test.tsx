import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const { navigateMock, refreshMock, keyLoginMock } = vi.hoisted(() => ({
	navigateMock: vi.fn(),
	refreshMock: vi.fn(),
	keyLoginMock: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => ({
	...(await importOriginal<typeof import("react-router-dom")>()),
	useNavigate: () => navigateMock,
}));
vi.mock("@components/AuthContext", () => ({
	useAuth: () => ({ refresh: refreshMock }),
}));
vi.mock("@backend/api", () => ({ loginWithSecurityKey: keyLoginMock }));

import LoginForm from "@components/LoginForm";

function renderForm() {
	return render(
		<MemoryRouter>
			<LoginForm />
		</MemoryRouter>,
	);
}

beforeEach(() => {
	navigateMock.mockReset();
	refreshMock.mockReset();
	keyLoginMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("LoginForm", () => {
	it("logs in and navigates home when 2FA isn't required", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ twoFactorRequired: false }),
			}),
		);
		renderForm();

		await userEvent.setup().click(screen.getByRole("button", { name: "Login" }));

		await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/"));
		expect(refreshMock).toHaveBeenCalled();
		expect(keyLoginMock).not.toHaveBeenCalled();
	});

	it("runs the security-key step when the server requires 2FA", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ twoFactorRequired: true }),
			}),
		);
		keyLoginMock.mockResolvedValue(undefined);
		renderForm();

		await userEvent.setup().click(screen.getByRole("button", { name: "Login" }));

		await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/"));
		expect(keyLoginMock).toHaveBeenCalled();
	});

	it("shows an error and does not navigate on bad credentials", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
		renderForm();

		await userEvent.setup().click(screen.getByRole("button", { name: "Login" }));

		expect(await screen.findByText(/login failed/i)).toBeTruthy();
		expect(navigateMock).not.toHaveBeenCalled();
	});
});
