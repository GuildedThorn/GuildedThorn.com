import { useEffect, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import LazyOnVisible from "@components/LazyOnVisible";
// react-github-calendar is a CJS package. Vite's esbuild prebundle flattens its
// default export to the component, but rolldown (Vite 8) double-wraps it as
// { default: { default: Component } } for dynamic imports — React.lazy then gets
// an object, not a component, and throws "element type is invalid" (#306).
// Unwrap whichever shape the bundler produces.
const GitHubCalendar = lazy(() =>
  import("react-github-calendar").then((m) => {
    const mod = m as unknown as { default: unknown };
    const comp = (mod.default as { default?: unknown })?.default ?? mod.default;
    return { default: comp as typeof m.default };
  }),
);
import {
  populateGithubData,
  populateProjectData,
  populateRecentProjectData,
} from "@backend/api";
import { Info, Project } from "@backend/types";
import { Discord } from "@components/Discord";
import SpotifyTopArtists from "@components/Spotify";
import SpotifyBanner from "@components/SpotifyBanner";
import { Card } from "@components/ui/Card";
import { Button } from "@components/ui/Button";
import { cn } from "@lib/utils";
import Seo from "@components/Seo";
import { Check, Star, GitFork, ExternalLink } from "lucide-react";

/* Automobiles — add a new car by appending an object to this array. */
interface CarPart {
  name: string;
  done?: boolean;
}

interface Automobile {
  name: string;
  model: string;
  year: string;
  paint: string;
  miles: string;
  parts: CarPart[];
}

const cars: Automobile[] = [
  {
    name: "2004 Trailblazer EXT",
    model: "Trailblazer LT EXT",
    year: "2004",
    paint: "Black (Red Trim)",
    miles: "300K+",
    parts: [
      { name: "Passenger Side Front Fender", done: true },
      { name: "4L60E Transmission Rebuild Kit" },
      { name: "Lower and Upper Control Arms" },
      { name: "Mechman Alternator" },
      { name: "XS Power Battery" },
      { name: "Big 3 Wiring Kit" },
      { name: "Coil Packs" },
      { name: "Spark Plugs" },
      { name: "Fan Clutch" },
      { name: "Throttle Body" },
      { name: "Shocks" },
      { name: "Rotors, Pads, and Struts" },
      { name: "Timing Belt/Serpentine Belt" },
    ],
  },
];

function CarCard({ car }: { car: Automobile }) {
  const doneCount = car.parts.filter((p) => p.done).length;
  const specs: [string, string][] = [
    ["Model", car.model],
    ["Year", car.year],
    ["Paint Color", car.paint],
    ["Miles", car.miles],
  ];

  return (
    <div className="rounded-xl border border-border bg-muted px-6 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{car.name}</h2>
        <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          {doneCount}/{car.parts.length} parts done
        </span>
      </div>

      <div className="flex flex-col gap-8 text-sm md:flex-row md:text-base">
        {/* Specs */}
        <div className="min-w-0 flex-1">
          <h3 className="mb-2 font-semibold">Description</h3>
          <dl className="grid grid-cols-[6rem_1fr] gap-x-2 gap-y-1">
            {specs.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="min-w-0 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Part list */}
        <div className="flex-1">
          <h3 className="mb-2 font-semibold">Part List</h3>
          <ul className="space-y-1.5">
            {car.parts.map((part) => (
              <li key={part.name} className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    part.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-transparent",
                  )}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span
                  className={
                    part.done ? "text-muted-foreground line-through" : ""
                  }
                >
                  {part.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const githubBaseUrl = "https://github.com/GuildedThorn";

// Which GitHub feed backs the Projects grid. "pinned" hits the pinned-repos
// API; "recent" hits the most-recently-pushed-to repos.
const PROJECT_MODES = [
  { value: "pinned", label: "Pinned" },
  { value: "recent", label: "Recently Committed" },
] as const;
type ProjectMode = (typeof PROJECT_MODES)[number]["value"];

function App() {
  const [info, setInfo] = useState<Info>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMode, setProjectMode] = useState<ProjectMode>("pinned");
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInfo() {
      try {
        const info = await populateGithubData(controller.signal);
        if (info) setInfo(info);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Fetch aborted");
        } else {
          console.error("Fetch error:", error);
        }
      } finally {
        setLoading(false);
      }
    }

    loadInfo().then(null);

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProjects() {
      setProjectsLoading(true);
      setProjectsError("");
      try {
        const data =
          projectMode === "recent"
            ? await populateRecentProjectData(controller.signal)
            : await populateProjectData(controller.signal);
        // Replace, not merge — a failed load must never leave the other
        // mode's repos on screen pretending to be this one's.
        setProjects(data ?? []);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Fetch aborted");
        } else {
          console.error("Fetch error:", error);
          setProjects([]);
          setProjectsError("Couldn’t load these repos right now.");
        }
      } finally {
        setProjectsLoading(false);
      }
    }

    loadProjects().then(null);

    return () => controller.abort();
  }, [projectMode]);

  function getMyAge(): number {
    const birthDate = new Date(2003, 2, 17); // Note: Month is 0-indexed (2 = March)
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    // If today's date is before March 17th in the current year, subtract 1
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }

    return age;
  }

  if (loading)
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading projects...
      </div>
    );

  return (
    <div className="page">
      <Seo
        title="Jamie Duddleston"
        description="Jamie Duddleston (GuildedThorn) — software developer and cybersecurity enthusiast from Chicago. Full-stack projects, blog, gallery, and live radio."
        path="/"
      />
      <header className="pb-10 text-center sm:pb-14">
        <p className="eyebrow mb-4">Jamie Duddleston · Chicago</p>
        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
          <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            GuildedThorn
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
          Software developer and cybersecurity enthusiast who loves building
          things, taking them apart to learn how they work, and putting the
          pedal to the metal.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/resume">
            <Button>View résumé</Button>
          </Link>
          <Link to="/contact">
            <Button variant="outline">Get in touch</Button>
          </Link>
        </div>
      </header>

      <div className="section">
        <Card className="lg:col-span-2">
          <h2 className="text-3xl mb-3">About Me</h2>
          <img
            className="w-full max-w-md rounded-2xl shadow-lg mx-auto m-2"
            src="/images/portrait.jpg"
            alt="Portrait of Jamie Duddleston"
            width={1620}
            height={1080}
            loading="lazy"
            decoding="async"
          />
          <div className={"flex flex-col gap-3"}>
            <p>
              I am{" "}
              <span className="group relative cursor-pointer font-bold border-b border-dashed border-gray-400">
                {getMyAge()}
                {/* Tooltip Wrapper */}
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 scale-90 rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100 whitespace-nowrap">
                  March 17, 2003
                </span>
              </span>{" "}
              years old, I have many hobbies, some which include software
              development, cyber security, audio equipment, game development,
              chess, building bikes, and much more.
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

          <hr className="my-8 border-border" />

          <p className="eyebrow mb-3">Behind the name</p>
          <div className="items-center justify-center p-2">
            <img
              className="w-full max-w-md mx-auto"
              src="/images/Print_Transparent.svg"
              alt="GuildedThorn logo"
              loading="lazy"
              decoding="async"
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
              <a
                className="text-primary hover:underline"
                href={"https://gamejolt.com/games/guilded-thorn/158759"}
              >
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
          <h1 className="text-3xl mb-3">Setup</h1>
          <p>
            A lot of people ask me how I have obtained so much hardware over the
            years, as well as why (lol), I spent a very long time going through
            alleys, overstock centers, recyling places, Salvation Armys etc,
            looking for deals, accepting anything that I can and trading up as I
            went, as for why, why do people spend money on hobbies to begin
            with? It's something I enjoy doing, and it allows me to write more
            software in the process so who cares.
          </p>
          <div className="tile mt-4 p-4">
            <p className="eyebrow mb-3">Devices</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  name: "2011 MacBook Pro",
                  detail:
                    "2TB SSD · 16GB RAM · macOS Sonoma (OpenCore) + Kali Linux",
                },
                { name: '2021 iPad Pro 11"' },
                { name: "iPhone 11" },
                { name: "Nexus 6P" },
                { name: "TicWatch Pro 3 GPS" },
                { name: "Flipper Zero" },
                { name: "2× HackRF", detail: "one with PortaPack H2" },
                { name: "RTL-SDR", detail: "Bias Tee 5V FM LNA" },
                {
                  name: "Wii U",
                  detail: "Modded — Aroma + Tiramisu · 32GB SD, 256GB flash",
                },
                { name: "PS4", detail: "Modded — FW 9.0 + ESP32-S2 Mini" },
                { name: "Xbox One (Original)" },
                { name: "Xbox One S" },
                { name: "Steam Deck 1TB" },
                { name: "2× Quest 2" },
                { name: "2× Oculus CV1" },
                { name: "Apple TV 4K (3rd Gen)" },
              ].map((device) => (
                <div
                  key={device.name}
                  className="rounded-lg bg-background/60 p-3"
                >
                  <p className="font-medium">{device.name}</p>
                  {device.detail && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {device.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title={"Automobiles"}>
          <h1 className="text-3xl mb-3">Automobiles</h1>
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

          <div className="my-4 space-y-4">
            {cars.map((car) => (
              <CarCard key={car.name} car={car} />
            ))}
          </div>
        </Card>
      </div>

      <div className="section">
        <Card title={"Audiophile"}>
          <h1 className="text-3xl mb-3">Audiophiles</h1>
          <p className="text-sm md:text-base text-center mt-4">
            I love music, listen to numerous genres getting suggestions from a
            lot of different people and cultures, and sometimes introducing
            people to new genres also :D, I want to get back into producing
            again, but my limited time has prevented me from doing so
          </p>

          <SpotifyBanner />

          <div className="tile my-4 p-4 text-left">
            <h2 className="mb-4 text-xl font-semibold">Room Setup</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Receiver", value: "Pioneer RX-V765" },
                {
                  label: "Center Speaker",
                  value: "JBL N-Center, Klipsch KSF-C5",
                },
                { label: "Left/Right Front", value: "2x Sony 3-way speakers" },
                { label: "Surround", value: "Legrand + Sharp 3-way speakers" },
                { label: "Presence", value: "2x Pioneer Graybar TV Speakers" },
                { label: "Rear", value: "2x Pioneer 3-way speakers" },
                {
                  label: "Amps",
                  value:
                    "2500W Power Acoustik, 1000W Pioneer, 1000W Skar Audio RP1504AB",
                },
                { label: "Right Subwoofer", value: "2x Kicker CompVR" },
                { label: "Left Subwoofer", value: "2x Kicker CompC" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-background/60 p-3">
                  <dt className="eyebrow">{label}</dt>
                  <dd className="mt-0.5 text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <SpotifyTopArtists />
        </Card>

        <Card title={"Software Development"}>
          <h1 className="text-3xl mb-3">Software Development</h1>
          <p className={"flex flex-col py-4"}>
            I write a lot of software, frontend, backend, you name it. My
            workflow is constantly changing and improving but currently my main
            languages I write in are c#, typescript, c, c++, I use a pretty
            opinionated and heavy neovim setup.
          </p>

          {/* GitHub stats */}
          {info && (
            <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Hireable", value: info.hireable ? "Yes" : "No" },
                { label: "Public Repos", value: info.public_repos },
                { label: "Followers", value: info.followers },
                { label: "Following", value: info.following },
              ].map((stat) => (
                <div key={stat.label} className="tile p-3 text-center">
                  <p className="font-mono text-2xl font-bold tabular-nums">
                    {stat.value}
                  </p>
                  <p className="eyebrow mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Projects */}
          <div className="mt-6 mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-left text-xl font-semibold">Projects</h2>

            <div className="ml-auto inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
              {PROJECT_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setProjectMode(m.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    projectMode === m.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {projectsError && !projectsLoading ? (
            <p className="text-sm text-muted-foreground">{projectsError}</p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {projectsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="tile flex flex-col gap-3 p-4">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted-foreground/20" />
                    <div className="h-3 w-full animate-pulse rounded bg-muted-foreground/20" />
                    <div className="h-3 w-24 animate-pulse rounded bg-muted-foreground/20" />
                  </div>
                ))
              : projects.map((project) => (
                  <a
                    key={project.name}
                    href={`${githubBaseUrl}/${project.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group tile flex min-w-0 flex-col gap-3 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 break-words font-semibold group-hover:text-primary">
                        {project.name}
                      </h3>
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>

                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {project.description || "No description provided."}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center gap-4 font-mono text-sm text-muted-foreground">
                      {project.language && (
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: project.languageColor }}
                          />
                          {project.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1 tabular-nums">
                        <Star className="h-3.5 w-3.5" /> {project.stars}
                      </span>
                      <span className="flex items-center gap-1 tabular-nums">
                        <GitFork className="h-3.5 w-3.5" /> {project.forks}
                      </span>
                    </div>
                  </a>
                ))}
          </div>

          {/* GitHub activity */}
          <div className="tile mt-6 p-4">
            <h2 className="mb-4 text-center text-xl font-semibold">
              GitHub Activity
            </h2>
            <div className="overflow-x-auto">
              <LazyOnVisible
                fallback={
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Loading activity…
                  </div>
                }
              >
                <Suspense
                  fallback={
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Loading activity…
                    </div>
                  }
                >
                  <GitHubCalendar username="GuildedThorn" />
                </Suspense>
              </LazyOnVisible>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default App;
