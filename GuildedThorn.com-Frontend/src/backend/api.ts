import {
	startRegistration,
	startAuthentication,
} from "@simplewebauthn/browser";

export async function populateGithubData(signal: AbortSignal) {
	const response = await fetch("/api/Github/getInfo", { signal });
	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`GitHub request failed: ${response.status} - ${errorText}`);
	}
	return response.json();
}

export async function populateProjectData(signal: AbortSignal) {
	const response = await fetch("/api/Github/getProjects", { signal });
	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Projects request failed: ${response.status} - ${errorText}`);
	}
	return response.json();
}

export async function populateRecentProjectData(signal: AbortSignal) {
	const response = await fetch("/api/Github/getRecentProjects", { signal });
	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Projects request failed: ${response.status} - ${errorText}`);
	}
	return response.json();
}

export async function getTopSpotifyArtists() {
	const res = await fetch("/api/spotify/top-artists");
	if (!res.ok) {
		const errorText = await res.text();
		throw new Error(`Failed to fetch top artists: ${errorText}`);
	}
	return res.json();
}

export async function register(username: string, password: string) {
	const response = await fetch("/api/auth/register", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ username, password }),
		credentials: "include", // if your backend sets cookies on registration
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Registration failed: ${errorText}`);
	}
	return response.json();
}

export async function login(username: string, password: string) {
	const response = await fetch("/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ username, password }),
		credentials: "include", // to receive HttpOnly cookie for auth session
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Login failed: ${errorText}`);
	}
	return response.json();
}

export async function logout() {
	const response = await fetch("/api/auth/logout", {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Logout failed: ${errorText}`);
	}
	return response.json();
}

export async function getVapidPublicKey(): Promise<string> {
	const res = await fetch("/api/push/vapidPublicKey");
	if (!res.ok) throw new Error(`Failed to fetch VAPID key: ${res.status}`);
	const data = await res.json();
	return data.publicKey as string;
}

export async function subscribePush(sub: PushSubscription): Promise<void> {
	const json = sub.toJSON();
	const res = await fetch("/api/push/subscribe", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include", // attaches username if logged in (optional)
		body: JSON.stringify({
			endpoint: sub.endpoint,
			p256dh: json.keys?.p256dh,
			auth: json.keys?.auth,
		}),
	});
	if (!res.ok) throw new Error(`Subscribe failed: ${res.status}`);
}

export async function unsubscribePush(endpoint: string): Promise<void> {
	await fetch("/api/push/unsubscribe", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ endpoint }),
	});
}

export interface ChatMessage {
	id: string;
	user: string;
	content: string;
	timestamp: string;
	avatarUrl?: string | null;
	role?: string | null;
}

export async function getChatHistory(): Promise<{ antiRaid: boolean; messages: ChatMessage[] }> {
	const res = await fetch("/api/chat/history");
	if (!res.ok) throw new Error(`Failed to load chat history: ${res.status}`);
	return res.json();
}

export interface StreamEvent {
	id: string;
	date: string; // YYYY-MM-DD
	time: string; // HH:MM
	title: string;
}

export async function getStreamSchedule(): Promise<StreamEvent[]> {
	const res = await fetch("/api/streamschedule");
	if (!res.ok) throw new Error(`Failed to load schedule: ${res.status}`);
	return res.json();
}

export async function createStreamEvent(date: string, time: string, title: string): Promise<StreamEvent> {
	const res = await fetch("/api/streamschedule", {
		method: "POST",
		credentials: "include", // owner-only on the server
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ date, time, title }),
	});
	if (!res.ok) throw new Error(`Failed to add stream: ${res.status}`);
	return res.json();
}

export async function deleteStreamEvent(id: string): Promise<void> {
	const res = await fetch(`/api/streamschedule/${id}`, {
		method: "DELETE",
		credentials: "include",
	});
	if (!res.ok) throw new Error(`Failed to delete stream: ${res.status}`);
}

export async function updateUserData(userData: { FirstName?: string; LastName?: string; Email?: string }) {
	const response = await fetch("/api/user/updateData", {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(userData),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Update failed: ${errorText}`);
	}
	return response.json();
}

export async function sendContactMessage(payload: {
	name: string;
	email: string;
	message: string;
}) {
	const res = await fetch("/api/contact", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!res.ok) {
		const errorText = await res.text().catch(() => "");
		throw new Error(errorText || `Request failed: ${res.status}`);
	}
	return res.json().catch(() => ({}));
}

export interface ContactMessageItem {
	id: string;
	name: string;
	email: string;
	message: string;
	isRead: boolean;
	createdAt: string;
}

export async function getContactMessages(
	page = 1,
	pageSize = 50,
): Promise<{
	items: ContactMessageItem[];
	totalPages: number;
	unread: number;
	total: number;
}> {
	const res = await fetch(`/api/contact?page=${page}&pageSize=${pageSize}`, {
		credentials: "include",
	});
	if (!res.ok) {
		const errorText = await res.text().catch(() => "");
		throw new Error(errorText || `Request failed: ${res.status}`);
	}
	return res.json();
}

export async function markContactMessageRead(id: string, read = true) {
	const res = await fetch(`/api/contact/${id}/read?read=${read}`, {
		method: "PATCH",
		credentials: "include",
	});
	if (!res.ok) throw new Error(`Request failed: ${res.status}`);
}

export async function deleteContactMessage(id: string) {
	const res = await fetch(`/api/contact/${id}`, {
		method: "DELETE",
		credentials: "include",
	});
	if (!res.ok) throw new Error(`Request failed: ${res.status}`);
}

export async function deleteGuestBookMessage(id: string) {
	const res = await fetch(`/api/guestbook/${id}`, {
		method: "DELETE",
		credentials: "include",
	});
	if (!res.ok) {
		const errorText = await res.text().catch(() => "");
		throw new Error(errorText || `Request failed: ${res.status}`);
	}
}

export async function banGuestBookUser(username: string) {
	const res = await fetch("/api/guestbook/ban", {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ username }),
	});
	if (!res.ok) {
		const errorText = await res.text().catch(() => "");
		throw new Error(errorText || `Request failed: ${res.status}`);
	}
}

/* ───────────────────────── WebAuthn / YubiKey ───────────────────────── */

export interface SecurityKey {
	id: string;
	nickname: string;
	createdAt: string;
	lastUsedAt: string;
}

async function asError(res: Response, fallback: string) {
	const text = await res.text().catch(() => "");
	return new Error(text || fallback);
}

// Enroll a new security key for the signed-in user (touch/PIN prompt).
export async function registerSecurityKey(nickname: string) {
	const begin = await fetch("/api/webauthn/register/begin", {
		method: "POST",
		credentials: "include",
	});
	if (!begin.ok) throw await asError(begin, "Couldn’t start key registration.");
	const { id, optionsJson } = await begin.json();

	const attestation = await startRegistration({
		optionsJSON: JSON.parse(optionsJson),
	});

	const finish = await fetch("/api/webauthn/register/finish", {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ id, nickname, response: attestation }),
	});
	if (!finish.ok) throw await asError(finish, "Couldn’t register that key.");
}

// Log in with a security key. Omit username for passwordless (discoverable key);
// pass a username to scope it as a second factor for that account.
export async function loginWithSecurityKey(username?: string) {
	const begin = await fetch("/api/webauthn/assert/begin", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ username: username ?? null }),
	});
	if (!begin.ok) throw await asError(begin, "Couldn’t start security-key login.");
	const { id, optionsJson } = await begin.json();

	const assertion = await startAuthentication({
		optionsJSON: JSON.parse(optionsJson),
	});

	const finish = await fetch("/api/webauthn/assert/finish", {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ id, response: assertion }),
	});
	if (!finish.ok) throw await asError(finish, "Security-key login failed.");
}

export async function listSecurityKeys(): Promise<SecurityKey[]> {
	const res = await fetch("/api/webauthn/credentials", {
		credentials: "include",
	});
	if (!res.ok) throw await asError(res, "Couldn’t load security keys.");
	return res.json();
}

export async function deleteSecurityKey(id: string) {
	const res = await fetch(`/api/webauthn/credentials/${id}`, {
		method: "DELETE",
		credentials: "include",
	});
	if (!res.ok) throw await asError(res, "Couldn’t remove that key.");
}

export async function getTwoFactorStatus(): Promise<{
	enabled: boolean;
	hasKeys: boolean;
}> {
	const res = await fetch("/api/webauthn/two-factor", {
		credentials: "include",
	});
	if (!res.ok) throw await asError(res, "Couldn’t load 2FA status.");
	return res.json();
}

export async function setTwoFactor(enabled: boolean) {
	const res = await fetch("/api/webauthn/two-factor", {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ enabled }),
	});
	if (!res.ok) throw await asError(res, "Couldn’t update 2FA.");
	return res.json();
}
