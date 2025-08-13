import { useState, useEffect, useRef } from "react";

function RadioPlayer() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSong, setCurrentSong] = useState("Loading...");
    const audioRef = useRef(null);

    // Poll Icecast status endpoint for metadata every 10s
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const res = await fetch("https://radio.guildedthorn.com/status-json.xsl");
                if (!res.ok) throw new Error("Failed to fetch metadata");
                const data = await res.json();

                // Navigate JSON to get current song title
                // Icecast JSON structure may vary; example below assumes:
                // data.icestats.source[0].title or data.icestats.source.title if only one source
                let title = "Unknown Song";

                if (data.icestats.source) {
                    const source = Array.isArray(data.icestats.source) ? data.icestats.source[0] : data.icestats.source;
                    title = source.title || source.artist || source.song || "Unknown Song";
                }

                setCurrentSong(title);
            } catch (e) {
                setCurrentSong("No metadata available");
            }
        };

        fetchMetadata();
        const interval = setInterval(fetchMetadata, 10000); // every 10 seconds

        return () => clearInterval(interval);
    }, []);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            // @ts-ignore
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            // @ts-ignore
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    return (
        <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg shadow bg-gray-900 text-white">
            <audio ref={audioRef} src="https://radio.guildedthorn.com" preload="none" />
            <button
                onClick={togglePlay}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition"
            >
                {isPlaying ? "Pause" : "Play"}
            </button>
            <div className="text-center">
                <p className="text-lg font-semibold">Now Playing:</p>
                <p className="italic">{currentSong}</p>
            </div>
        </div>
    );
}

export default RadioPlayer;
