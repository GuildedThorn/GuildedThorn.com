import { useEffect, useState } from "react";
import { getTopSpotifyArtists } from "@backend/api";
import { Artist } from "@backend/types";

function SpotifyTopArtists() {
	const [artists, setArtists] = useState<Artist[]>([]);
	const [error, setError] = useState("");

	useEffect(() => {
		const loadArtists = async () => {
			try {
				const data = await getTopSpotifyArtists();
				setArtists(data);
			} catch (err) {
				setError("Failed to load Spotify artists");
				console.error(err);
			}
		};

		loadArtists().then();
	}, []);

	if (error) return <div>{error}</div>;

	return (
		<div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
			<h2 className="text-xl font-bold mb-4">Top Artists</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{artists.map((artist, index) => (
					<div key={index} className="flex items-center space-x-4 p-3">
						{artist.imageUrl && (
							<img
								src={artist.imageUrl}
								alt={artist.name}
								className="w-16 h-16 rounded"
							/>
						)}
						<div>
							<p className="font-semibold">{artist.name}</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export default SpotifyTopArtists;
