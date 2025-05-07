import '@styles/App.css';
import Table from "@components/Table.tsx";

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

function App() {
    return (
        <>
            <div className="py-8 text-center">
                <h1 className="text-3xl font-bold mb-4">Welcome to my portfolio</h1>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-8 py-6">
                <div className="border border-gray-600 rounded-lg p-4 bg-gray-800">
                    <img
                        className="w-full max-w-md rounded-2xl shadow-lg mx-auto"
                        src="/images/Portfolio-Image.jpg"
                        alt="Portfolio"
                    />
                    <h1>Jamie Duddleston</h1>
                    <p className="text-lg mb-8">
                        I am 22 years old, I have many hobbies, some which include software
                        development, cyber security, audio equipment, game development, chess, building bikes, and much
                        more.
                    </p>
                </div>
                <div className="border border-gray-600 rounded-lg p-4 bg-gray-800">
                    {/* Container for logo and h1 */}
                    <div className="items-center justify-center my-6">
                    {/* Logo Image */}
                        <img
                            className="w-full, max-w-md rounded-2xl shadow-lg mx-auto"
                            src="/images/Logo.svg"
                            alt="Logo"
                        />
                        {/* Title */}
                        <h1>GuildedThorn</h1>
                    </div>

                    <p className="text-lg mb-8 mt-4">
                        Many people know me by my online persona: Thorn, I have had many handles in my life, but I think
                        this one is to stay, I was a huge factions player on Minecraft at the time,
                        so to me this username is a collective of things, Gilded meaning dressed in gold or perfect, Guild
                        meaning a group of people in a team, and Thorn which in greek is skolops and can be used to describe
                        a pointed stake, or sharp object,
                        which is what I was considered in game, the final dagger to many of the factions I played against,
                        not too long after deciding on the handle I found this on
                        <a href={"https://gamejolt.com/games/guilded-thorn/158759"}> Gamejolt</a>, and knew it was meant to
                        be. I wear the name with pride as many have accepted it for me.
                    </p>
                </div>
            </div>
                
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8">
                    <div className="border border-gray-600 rounded-lg p-4 bg-gray-800">
                        <h1 className={"font-[Caveat,_cursive]"}>Audiophile</h1>
                        <p>
                            I love music, audio systems, lighting, lasers, and pyrotechnics. I have build a lot of audio
                            systems over the years, and lighting setups,
                            but I have never gotten near laser or pyrotechnic automation, that's not to say I haven't
                            researched a lot on the subject :D
                        </p>
                        <p className="text-sm md:text-base text-center mt-4">
                            Current build includes speakers from Pioneer, Sony, Legrand, and more, powered by multiple
                            high-end subwoofer amps.
                        </p>
                        <div className="mt-4 space-y-2 text-sm md:text-base">
                            <p>
                                <strong>Receiver:</strong> Pioneer RX-V765
                            </p>
                            <p>
                                <strong>Center Speaker:</strong> 1x JBL N-Center, 1x Klipsch KSF-C5
                            </p>
                            <p>
                                <strong>Left and Right Front Speaker:</strong> 2x Sony 3-way speakers
                            </p>
                            <p>
                                <strong>Left and Right Surround:</strong> 2x Legrand speakers, 2x Sharp 3-way
                                speakers
                            </p>
                            <p>
                                <strong>Left and Right Presence:</strong> 2x Pioneer Graybar TV Speakers
                            </p>
                            <p>
                                <strong>Left and Right Rear Speaker:</strong> 2x Pioneer 3-way speakers
                            </p>
                            <p>
                                <strong>Right Subwoofer:</strong> 2x Kicker CompVR
                            </p>
                            <p>
                                <strong>Left Subwoofer:</strong> 2x Kicker CompC
                            </p>
                            <p>
                                <strong>Subwoofer AMP #1:</strong> 2500W Power Acoustik Monoblock
                            </p>
                            <p>
                                <strong>Subwoofer AMP #2:</strong> 1000W Pioneer
                            </p>
                            <p>
                                <strong>Subwoofer AMP #3:</strong> 1000W Skar Audio RP1504AB
                            </p>
                        </div>
                    </div>
                    <div className="border border-gray-600 rounded-lg p-4 bg-gray-800">
                        <h1 className={"font-[Caveat,_cursive]"}>PC Setup</h1>
                        <p>
                            I spend a LOT of time working on hardware, from my pcs, to my phones, consoles, laptops
                            (macbook, everything else), tablets (android, ipad),
                            to even stuff like printers (ink, FDM, Resin), camera, tvs and much more.
                            I take pride in my work: even if my workspace doesnt agree with the mess sometimes haha.
                        </p>
                        <div className="overflow-x-auto mt-4">
                            <Table headers={headers} data={data}/>
                        </div>
                    </div>
                    <div className="border border-gray-600 rounded-lg p-4 bg-gray-800">
                        <h1 className={"font-[Caveat,_cursive]"}>Software Development</h1>
                        <p className={"py-4"}>I write a lot of software, frontend, backend, you name it. I have many preferred languages,
                            but you'll mostly see me writing in c#, java, typescript.
                            I used to be a SQL main but now I mostly use MongoDB now. My IDE of choice is any Jetbrains
                            Product, but for small things I will use nvim or nano.
                        </p>
                        <div className="border border-gray-400 rounded-lg p-4 bg-gray-600">
                            <div className="p-4">
                                <h1>Thorn Blog</h1>
                                <p className={"p-4"}>My personal blog site, with built in RSS support. I post most
                                    of my project updates
                                    here
                                    and plans for future ones.</p>
                            </div>
                            <hr className="my-12 h-0.5 border-t-0 bg-neutral-100 dark:bg-white/10"/>
                            <div className="p-4">
                                <h1>Thorn Radio</h1>
                                <p className={"p-4"}>My internet radio stream using IceCast2 + my own react +
                                    asp.net template, with real
                                    time chat support,
                                    MongoDB support, and account creation support with JWT tokens</p>
                            </div>
                        </div>
                    </div>
                </div>
        </>
    )
}

export default App;
