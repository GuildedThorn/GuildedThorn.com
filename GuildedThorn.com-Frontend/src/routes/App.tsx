import "@styles/App.css";

import Table from "@components/Table";
import { useEffect, useState } from "react";
import GitHubCalendar from "react-github-calendar";
import { populateGithubData, populateProjectData } from "@backend/api";
import { Info, Project } from "@backend/types";
import { Discord } from "@components/Discord.tsx";
import SpotifyTopArtists from "@components/Spotify.tsx";
import Card from "@components/Card.tsx";

const builds = [
	{
		build: "Main",
		cpu: "Ryzen 9 5900X",
		ram: "32GB Corsair Vengeance RGB",
		gpu: "MSI RX 6700XT 2X Mech OC",
		psu: "EVGA 850w",
		ssd1: "2TB Samsung 980 EVO",
		ssd2: "2TB Crucial NVMe",
		extras: "USB 3.0 PCIE card",
	},
	{
		build: "Streaming",
		cpu: "Ryzen 7 5700X",
		ram: "16GB Corsair 3600MHz",
		gpu: "RTX 2070 Founders Edition",
		psu: "EVGA 850w",
		ssd1: "2TB Sabrent Rocket Plus",
		ssd2: "N/A",
		extras: "Elgato 4K60 Pro",
	},
	{
		build: "2011 Mac Pro",
		cpu: "2x Xeon X5690",
		ram: "128GB DDR3 ECC 1333MHz",
		gpu: "Radeon HD 7950",
		psu: "980w",
		ssd1: "Samsung 850 EVO 250GB",
		ssd2: "N/A",
		extras: "USB 3.0 PCIE card",
	},
];

const headers = [
	"Build",
	"CPU",
	"RAM",
	"GPU",
	"PSU",
	"SSD 1",
	"SSD 2",
	"Extras",
];
const data = builds.map((build) => [
	build.build,
	build.cpu,
	build.ram,
	build.gpu,
	build.psu,
	build.ssd1,
	build.ssd2,
	build.extras,
]);

const spotifyProfileLink =
	"https://open.spotify.com/user/lint74q8j4m2mq36z3wyt2obt";
const githubBaseUrl = "https://github.com/GuildedThorn";

function App() {
	// const [isDarkMode, setIsDarkMode] = useState(false);
	const [info, setInfo] = useState<Info>();
	const [projects, setProjects] = useState<Project[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadData = async () => {
			try {
				const info = await populateGithubData();
				if (info) setInfo(info);

				const data = await populateProjectData();
				if (data) setProjects(data);
			} catch (error) {
				console.error("Failed to load data:", error);
			} finally {
				setLoading(false);
			}
		};

		loadData().then(() => {});
	}, []);

	useEffect(() => {
		// const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		// // setIsDarkMode(dark);
	}, []);

	if (loading)
		return (
			<div className="p-4 text-center text-gray-500">Loading projects...</div>
		);

	return (
		<>
			<div className="py-8 text-center">
				<h1 className="text-3xl font-bold mb-4">Welcome to my portfolio</h1>
			</div>

			<div className="section">
				<Card title={"Jamie Duddleston"}>
					<img
						className="w-full max-w-md rounded-2xl shadow-lg mx-auto m-2"
						src="/images/Portfolio-Image.jpg"
						alt="Portfolio"
					/>
					<div className={"flex flex-col gap-3"}>
						<p>
							I am 22 years old, I have many hobbies, some which include
							software development, cyber security, audio equipment, game
							development, chess, building bikes, and much more.
						</p>
						<p>
							I was born and raised in Chicago, Illinois, I was a curious kid.
							Always taking stuff apart to see how it worked (sometimes breaking
							and sometimes being able to put it back together again :D) I make
							mistakes like any other person, but I do learn from them, adapt
							and try to prevent them again. I love sports, enjoy my morning
							walks, and love to run. When I'm outside with headphones on there
							is nothing holding me back, the breeze on my face, the warming
							sensation of the sun, the birds chirping, I live for it all.
						</p>
						<p>
							I love automobiles and aircraft, going to car shows as a kid,
							being surrounded around mechanics and truck drivers, growing up
							with two of my best friends who are now in the air force. I am
							looking for a place where I can thrive, work my butt off and put
							the pedal to the metal. If you are interested in hiring me, dont
							hesitate to contact me at any of the given locations in my contact
							section.
						</p>
					</div>
				</Card>

				<Card title={"GuildedThorn"}>
					<div className="items-center justify-center p-2">
						<img
							className="w-full max-w-md rounded-2xl shadow-lg mx-auto"
							src="/images/Logo.svg"
							alt="Logo"
						/>
					</div>

					<div className={"flex flex-col gap-3"}>
						<p>
							Many people know me by my online persona: Thorn, I have had many
							handles in my life, but I think this one is to stay.
						</p>
						<p>
							I was a huge factions player on Minecraft at the time, so to me
							this username is a collective of things; Gilded (dressed in gold
							or perfect), Guild (a group of people in a team), and Thorn which
							in greek is `skolops (a pointed stake, or sharp object).
						</p>
						<p>
							Looking back I guess that's what I was considered in game, the
							final dagger to many of the factions I played against. Not too
							long after deciding on the handle I found this on
							<a href={"https://gamejolt.com/games/guilded-thorn/158759"}>
								{" "}
								Gamejolt
							</a>
							, and knew it was meant to be. I wear the name with pride as many
							have accepted it for me.
						</p>
					</div>
					<Discord />
				</Card>
			</div>

			<div className="section">
				{/* Setup */}
				<Card title={"Setup"}>
					<p>
						I spend a LOT of time working on hardware... printers, camera, tvs
						and much more.
					</p>
					<div className="overflow-x-auto mt-4">
						<Table headers={headers} data={data} />
					</div>

					<div className="border dark:border-gray-600 rounded-lg p-4 mt-4 bg-gray-100 dark:bg-gray-700">
						2011 Macbook Pro 2tb SSD 16gb Ram (MacOS Sonoma Open Core Patched +
						Kali Linux)
						<br />
						2021 Ipad Pro 11 inch
						<br />
						Iphone 11
						<br />
						Nexus 6p
						<br />
						Tic Watch Pro 3 GPS
						<br />
						Flipper Zero
						<br />
						2x HackRf (1 with Portapack h2)
						<br />
						Rtl-SDR + Bias Tee 5v FM LNA
						<br />
						Wii U (Heavily Modded (Aroma + Tiramisu)(32gb sd, 256gb flash))
						<br />
						Ps4 Heavily Modded (Firmware 9.0 + ESP32 S2 Mini)
						<br />
						Xbox One Original
						<br />
						Xbox One S
						<br />
						Steam Deck 1tb
						<br />
						2x Quest 2
						<br />
						2x Oculus CV1
						<br />
						Apple TV 4k 3rd Generation
					</div>
				</Card>

				<Card title={"Automobiles"}>
					<div className={"flex flex-col gap-3"}>
						<p>
							I love cars, many of my family and friends having project cars,
							going to shows as a kid (World of wheels, Cars and Coffee, Seneca
							car shows), and a lot more to name.
						</p>
						<p>
							I've wanted to get one for a very long time, it finally happened
							in 2025, my friend told me about a 2004 Trailblazer EXT on
							facebook marketplace being listed for 1k usd at 300k miles.
							Messaged the guy, went there check it out, came back about a week
							later with cash in hand and bought it, you know who you are. but
							thank you for letting me swap the solenoids in your driveway.
						</p>
						<p>
							We had to go 40mph down the side roads because it wouldn't go into
							3rd gear, which as of the date of writing this, I still have not
							dropped the trans and rebuilt it, but we got it home.
						</p>
					</div>

					<div className="border dark:border-gray-400 rounded-lg bg-gray-100 dark:bg-gray-700 py-6 px-6 mt-4 mb-4">
						<h1 className="text-xl font-semibold text-white mb-4">
							2004 Trail blazer EXT
						</h1>

						<div className="flex flex-col md:flex-row gap-8 text-sm md:text-base text-white">
							{/* Audio Info */}
							<div className="flex-1 space-y-2">
								<h2 className="font-semibold mb-2">Description</h2>
								<p>
									<strong>Model:</strong> Trailblazer EXT
								</p>
								<p>
									<strong>Year:</strong> 2004
								</p>
								<p>
									<strong>Paint Color:</strong> UNKNOWN
								</p>
								<p>
									<strong>Miles:</strong> 300K+
								</p>
							</div>

							{/* Part List */}
							<div className="flex-1">
								<h2 className="font-semibold mb-2">Part List</h2>
								<ul className="list-disc list-inside space-y-1">
									<li>Passenger Side Front Fender (DONE)</li>
									<li>4L60E Transmission Rebuild Kit</li>
									<li>Lower and Upper Control Arms</li>
									<li>Mechman Alternator</li>
									<li>XS Power Battery</li>
									<li>Big 3 Wiring Kit</li>
									<li>Coil Packs</li>
									<li>Spark Plugs</li>
									<li>Fan Clutch</li>
									<li>Throttle Body</li>
									<li>Shocks</li>
									<li>Rotors, Pads, and Struts</li>
									<li>Timing Belt/Serpentine Belt</li>
								</ul>
							</div>
						</div>
					</div>
				</Card>
			</div>

			<div className="section">
				<Card title={"Audiophile"}>
					<p>
						I love music, audio systems, lighting, lasers, and pyrotechnics...
					</p>
					<p className="text-sm md:text-base text-center mt-4">
						Current build includes speakers from Pioneer, Sony, Legrand, and
						more...
					</p>

					<a
						href={spotifyProfileLink}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center mt-4 space-x-2"
					><img
							src="https://spotify-drmg65jrz.vercel.app/api/spotify"
							alt="Spotify Profile"
							className="h-20 w-auto rounded-lg shadow-md"
					/></a>

					<div
						className="border dark:border-gray-400 rounded-lg bg-gray-100 dark:bg-gray-700 py-6 px-6 mt-4 mb-4">
						<h1>Room Setup</h1>
						<div className="mt-4 space-y-2 text-sm md:text-base">
							<p>
								<strong>Receiver:</strong> Pioneer RX-V765
							</p>
							<p>
								<strong>Center Speaker:</strong> JBL N-Center, Klipsch KSF-C5
							</p>
							<p>
								<strong>Left/Right Front:</strong> 2x Sony 3-way speakers
							</p>
							<p>
								<strong>Surround:</strong> Legrand + Sharp 3-way speakers
							</p>
							<p>
								<strong>Presence:</strong> 2x Pioneer Graybar TV Speakers
							</p>
							<p>
								<strong>Rear:</strong> 2x Pioneer 3-way speakers
							</p>
							<p>
								<strong>Amps:</strong> 2500W Power Acoustik, 1000W Pioneer, 1000W
								Skar Audio RP1504AB
							</p>
							<p>
								<strong>Right Subwoofer:</strong> 2x Kicker CompVR
							</p>
							<p>
								<strong>Left Subwoofer:</strong> 2x Kicker CompC
							</p>
						</div>
					</div>

					<SpotifyTopArtists/>
				</Card>

				<Card title={"Software Development"}>
					<p className={"flex flex-col py-4"}>
						I write a lot of software, frontend, backend, you name it. I have
						many preferred languages, but you'll mostly see me writing in c#,
						java, typescript. I used to be a SQL main but now I mostly use
						MongoDB now. My IDE of choice is any Jetbrains Product, but for
						small things I will use nvim or nano.
					</p>

					<div className="border dark:border-gray-400 rounded-lg bg-gray-100 dark:bg-gray-700 py-4 mt-4 mb-4">
						{info && (
							<div>
								<p className={"p-2"}>
									Looking for Job: {info.hireable ? "Yes" : "No"}
								</p>
								<p className={"p-2"}>Public Repos: {info.public_Repos}</p>
								<p className={"p-2"}>Followers: {info.followers}</p>
								<p className={"p-2"}>Following: {info.following}</p>
							</div>
						)}
					</div>

					<div className="border dark:border-gray-400 rounded-lg bg-gray-100 dark:bg-gray-700 py-4 mt-4 mb-4">
						{projects.map((project, index) => (
							<div key={index}>
								<h2 className="text-lg font-bold">{project.name}</h2>
								<p className="p-2">
									{project.description || "No description provided."}
								</p>
								<div className="items-center gap-2 text-sm mt-2">
									<span
										className="text-gray-700 dark:text-gray-300 font-medium"
										style={{ color: project.languageColor }}
									>
										{project.language}
									</span>

									<span className="text-gray-600 dark:text-gray-400">
										⭐ {project.stars}
									</span>
									<span className="text-gray-600 dark:text-gray-400">
										🍴 {project.forks}
									</span>

									<br />
									<a
										href={`${githubBaseUrl}/${project.name}`}
										target="_blank"
										className="text-red-500 dark:text-red-400"
										rel="noopener noreferrer"
									>
										Git Link
									</a>
								</div>
								<hr className="my-12 h-0.5 border-t-0 bg-neutral-300 dark:bg-white/20" />
							</div>
						))}
					</div>
					<div className="border dark:border-gray-400 rounded-lg bg-gray-100 dark:bg-gray-700 py-4 mt-4 mb-4">
						<h2 className="text-xl font-semibold text-center mb-4">
							GitHub Activity
						</h2>
						<GitHubCalendar username="GuildedThorn" />
					</div>
				</Card>
			</div>
		</>
	);
}

export default App;
