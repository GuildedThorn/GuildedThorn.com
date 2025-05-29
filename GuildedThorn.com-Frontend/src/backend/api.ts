export async function populateGithubData() {
	try {
		const response = await fetch("/getInfo", {
			method: "GET",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) new Error("Failed to fetch weather data");
		return await response.json();
	} catch (error) {
		console.error(error);
	}
}

export async function populateProjectData() {
	try {
		const response = await fetch("/getProjects", {
			method: "GET",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) new Error("Failed to fetch weather data");
		return await response.json();
	} catch (error) {
		console.error(error);
	}
}

export async function getTopSpotifyArtists() {
	const res = await fetch("/api/spotify/top-artists");
	if (!res.ok) throw new Error("Failed to fetch top artists");
	return res.json();
}
