import '@styles/App.css';
import Table from "@components/Table.tsx";
import {useEffect, useState} from "react";
import GitHubCalendar from "react-github-calendar";
import {populateProjectData} from "../backend/api.ts";
import {Project} from "@backend/types.ts";
        

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
        extras: "USB 3.0 PCIE card"
    }
];

const headers = ["Build", "CPU", "RAM", "GPU", "PSU", "SSD 1", "SSD 2", "Extras"];
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

const spotifyProfileLink = "https://open.spotify.com/user/lint74q8j4m2mq36z3wyt2obt";
const githubBaseUrl = 'https://github.com/GuildedThorn';

function App() {

    const [isDarkMode, setIsDarkMode] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            const data = await populateProjectData();
            if (data) setProjects(data);
            setLoading(false);
        };

        loadData();
    }, []);

    useEffect(() => {
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDarkMode(dark);
    }, []);

    if (loading) return <div className="p-4 text-center text-gray-500">Loading projects...</div>;

    return (
        <>
            <div className="py-8 text-center">
                <h1 className="text-3xl font-bold mb-4">Welcome to my portfolio</h1>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-8 py-6">
                <div className="border dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
                    <img
                        className="w-full max-w-md rounded-2xl shadow-lg mx-auto"
                        src="/images/Portfolio-Image.jpg"
                        alt="Portfolio"
                    />
                    <h1>Jamie Duddleston</h1>
                    <p className="text-lg mb-8">
                        I am 22 years old, I have many hobbies, some which include software
                        development, cyber security, audio equipment, game development, chess, building bikes, and much more.
                    </p>
                </div>

                <div className="border dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
                    <div className="items-center justify-center my-6">
                        <img
                            className="w-full max-w-md rounded-2xl shadow-lg mx-auto"
                            src="/images/Logo.svg"
                            alt="Logo"
                        />
                        <h1 className="text-center text-xl font-semibold mt-4">Guilded Thorn</h1>
                    </div>

                    <p className="text-lg mb-8 mt-4">
                        Many people know me by my online persona: Thorn, I have had many handles in my life, but I think
                        this one is to stay, I was a huge factions player on Minecraft at the time,
                        so to me this username is a collective of things, Gilded meaning dressed in gold or perfect,
                        Guild
                        meaning a group of people in a team, and Thorn which in greek is `skolops and can be used to
                        describe
                        a pointed stake, or sharp object,
                        which is what I was considered in game, the final dagger to many of the factions I played
                        against,
                        not too long after deciding on the handle I found this on
                        <a href={"https://gamejolt.com/games/guilded-thorn/158759"}> Gamejolt</a>, and knew it was meant
                        to
                        be. I wear the name with pride as many have accepted it for me.
                    </p>

                    <img
                        className="mx-auto"
                        src={`https://lanyard.cnrad.dev/api/654849939175768074?theme=${
                            isDarkMode ? "dark" : "light"
                        }&bg=${isDarkMode ? "1e1e1e" : "ffffff"}&hideTimestamp=true`}
                        alt="Discord Status"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8">
                {/* Audiophile */}
                <div className="border dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
                    <h1 className="font-[Caveat,_cursive] text-2xl mb-2">Audiophile</h1>
                    <p>
                        I love music, audio systems, lighting, lasers, and pyrotechnics...
                    </p>
                    <p className="text-sm md:text-base text-center mt-4">
                        Current build includes speakers from Pioneer, Sony, Legrand, and more...
                    </p>

                    <a
                        href={spotifyProfileLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-4 space-x-2"
                    >
                        <img
                            src="https://spotify-drmg65jrz.vercel.app/api/spotify"
                            alt="Spotify Profile"
                            className="h-20 w-auto rounded-lg shadow-md"
                        />
                    </a>

                    <div className="mt-4 space-y-2 text-sm md:text-base">
                        <p><strong>Receiver:</strong> Pioneer RX-V765</p>
                        <p><strong>Center Speaker:</strong> JBL N-Center, Klipsch KSF-C5</p>
                        <p><strong>Left/Right Front:</strong> 2x Sony 3-way speakers</p>
                        <p><strong>Surround:</strong> Legrand + Sharp 3-way speakers</p>
                        <p><strong>Presence:</strong> 2x Pioneer Graybar TV Speakers</p>
                        <p><strong>Rear:</strong> 2x Pioneer 3-way speakers</p>
                        <p><strong>Amps:</strong> 2500W Power Acoustik, 1000W Pioneer, 1000W Skar Audio RP1504AB</p>
                        <p><strong>Right Subwoofer:</strong> 2x Kicker CompVR</p>
                        <p><strong>Left Subwoofer:</strong> 2x Kicker CompC</p>
                    </div>
                </div>

                {/* Setup */}
                <div className="border dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
                    <h1 className="font-[Caveat,_cursive] text-2xl mb-2">Setup</h1>
                    <p>
                        I spend a LOT of time working on hardware... printers, camera, tvs and much more.
                    </p>
                    <div className="overflow-x-auto mt-4">
                        <Table headers={headers} data={data} />
                    </div>

                    <div className="border dark:border-gray-600 rounded-lg p-4 mt-4 bg-gray-100 dark:bg-gray-700">
                        2011 Macbook Pro 2tb SSD 16gb Ram (MacOS Sonoma Open Core Patched + Kali Linux)
                        <br/>
                        2021 Ipad Pro 11 inch
                        <br/>
                        Iphone 11
                        <br/>
                        Nexus 6p
                        <br/>
                        Tic Watch Pro 3 GPS
                        <br/>
                        Flipper Zero
                        <br/>
                        2x HackRf (1 with Portapack h2)
                        <br/>
                        Rtl-SDR + Bias Tee 5v FM LNA
                        <br/>
                        Wii U (Heavily Modded (Aroma + Tiramisu)(32gb sd, 256gb flash))
                        <br/>
                        Ps4 Heavily Modded (Firmware 9.0 + ESP32 S2 Mini)
                        <br/>
                        Xbox One Original
                        <br/>
                        Xbox One S
                        <br/>
                        Steam Deck 1tb
                        <br/>
                        2x Quest 2
                        <br/>
                        2x Oculus CV1
                        <br/>
                        Apple TV 4k 3rd Generation
                    </div>
                </div>

                {/* Software Development */}
                <div className="border dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
                    <h1 className="font-[Caveat,_cursive] text-2xl mb-2">Software Development</h1>
                    <p className={"py-4"}>I write a lot of software, frontend, backend, you name it. I have many
                        preferred languages,
                        but you'll mostly see me writing in c#, java, typescript.
                        I used to be a SQL main but now I mostly use MongoDB now. My IDE of choice is any
                        Jetbrains
                        Product, but for small things I will use nvim or nano.
                    </p>

                    <div className="border dark:border-gray-400 rounded-lg bg-gray-100 dark:bg-gray-700 space-y-12">
                        {projects.map((project, index) => (
                            <div key={index}>
                                <h2 className="text-lg font-bold">{project.name}</h2>
                                <p className="p-2">
                                    {project.description || "No description provided."}
                                </p>
                                <div className="items-center gap-2 text-sm mt-2">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium" style={{color: project.languageColor}}>
                                        {project.language}
                                    </span>
                                    
                                    <span className="text-gray-600 dark:text-gray-400">⭐ {project.stars}</span>
                                    <span className="text-gray-600 dark:text-gray-400">🍴 {project.forks}</span>
                                    
                                    <br/>
                                    <a
                                        href={`${githubBaseUrl}/${project.name}`}
                                        target="_blank"
                                        className="text-red-500 dark:text-red-400"
                                        rel="noopener noreferrer"
                                    >
                                        Git Link
                                    </a>

                                </div>
                                <hr className="my-12 h-0.5 border-t-0 bg-neutral-300 dark:bg-white/20"/>
                            </div>
                        ))}
                    </div>
                    <div className={"py-6"}>
                        <GitHubCalendar username="GuildedThorn"/>
                    </div>
                </div>
            </div>
        </>
    );
}

export default App;
