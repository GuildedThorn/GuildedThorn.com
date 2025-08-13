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
