import { Link } from "react-router-dom";
import {
  Radio,
  Code2,
  Server,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Seo from "@components/Seo";

// ─────────────────────────────────────────────────────────────────────────────
// /colophon — "How this site is built". A plain-language tour of the stack for
// anyone (including non-engineers) skimming for 30 seconds. Edit the `sections`
// data below; nothing else references it except its route + nav entry.
// ─────────────────────────────────────────────────────────────────────────────

const LAST_UPDATED = "June 2026";

interface Item {
  name: string;
  detail: string;
}

interface Section {
  icon: LucideIcon;
  title: string;
  blurb: string;
  items: Item[];
}

const sections: Section[] = [
  {
    icon: Radio,
    title: "Live & real-time",
    blurb: "The parts that move — and none of them are third-party embeds.",
    items: [
      {
        name: "Live video stream",
        detail:
          "Self-hosted (Owncast) with a video player I wrote myself — it replaced Twitch entirely.",
      },
      {
        name: "24/7 radio",
        detail:
          "My own station, streamed straight from my DJ rig to the site — no external service.",
      },
      {
        name: "Live chat & alerts",
        detail:
          "Real-time over WebSockets: stream chat, “now live” toasts, and on-screen donation shoutouts.",
      },
      {
        name: "Push notifications",
        detail:
          "The site can ping you the moment I go live — even when the tab is closed.",
      },
    ],
  },
  {
    icon: Code2,
    title: "The app itself",
    blurb: "What this page is actually made of.",
    items: [
      { name: "C# / ASP.NET Core 9", detail: "The backend and all the APIs." },
      { name: "React + TypeScript + Vite", detail: "The interface you're using right now." },
      { name: "Tailwind CSS", detail: "Styling and the light/dark themes." },
      { name: "MongoDB", detail: "Stores posts, gallery, guestbook, donations, profiles." },
      { name: "RabbitMQ", detail: "A message queue for background jobs." },
    ],
  },
  {
    icon: Server,
    title: "Where it lives",
    blurb: "Hosted entirely on hardware I own — not a managed cloud platform.",
    items: [
      {
        name: "NixOS",
        detail:
          "The whole server is defined in code, so it rebuilds identically every single time.",
      },
      { name: "Proxmox VM", detail: "Runs on a machine in my own rack at home." },
      {
        name: "Cloudflare Tunnel",
        detail: "Public access with zero ports open to the internet.",
      },
      { name: "Grafana Loki", detail: "Centralised logs so I can see what's happening." },
      {
        name: "One-command deploy",
        detail: "A single script builds the whole site and ships it to the server.",
      },
    ],
  },
  {
    icon: ShieldCheck,
    title: "Security & privacy",
    blurb: "Built in from the start, not bolted on at the end.",
    items: [
      {
        name: "Passkeys / YubiKey",
        detail: "Hardware-key login (WebAuthn), not just a password.",
      },
      {
        name: "Hardened sessions",
        detail: "HttpOnly cookies, a strict content-security policy, HSTS, and rate limiting.",
      },
      {
        name: "Privacy-first",
        detail: "Cookies are consent-gated, and donor amounts stay private on profiles.",
      },
      {
        name: "Payments done right",
        detail: "Stripe hosted checkout — card details never touch my server.",
      },
    ],
  },
  {
    icon: Sparkles,
    title: "Odds & ends",
    blurb: "Things I built simply because they're fun.",
    items: [
      { name: "Developer tools", detail: "Regex tester, UUID + lorem generators, colour converter…" },
      { name: "Guestbook", detail: "Old-school — feel free to sign it." },
      { name: "Profiles & watchtime", detail: "Your radio/stream time, tracked on your own profile." },
      { name: "Network graph", detail: "An interactive map of how all of this connects." },
    ],
  },
];

export default function Colophon() {
  return (
    <div className="page text-left">
      <Seo
        title="How this site is built"
        description="A plain-language tour of the GuildedThorn stack — what's self-hosted, what it's made of, and how it ships."
        path="/colophon"
      />

      <h1 className="text-3xl font-bold tracking-tight">How this site is built</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        A look under the hood. Updated {LAST_UPDATED}.
      </p>

      {/* The hook: the one thing a 30-second skim should take away. */}
      <div className="panel mt-6 p-5">
        <p className="text-pretty leading-relaxed">
          Almost everything you see here — the{" "}
          <span className="font-semibold text-primary">live video</span>, the{" "}
          <span className="font-semibold text-primary">radio</span>, the{" "}
          <span className="font-semibold text-primary">live chat</span> — runs on
          hardware I own and software I wrote or assembled myself. No Twitch, no
          third-party players, no rented platforms. I build it this way because I
          like owning the whole thing end to end.
        </p>
      </div>

      <div className="mt-8 space-y-8">
        {sections.map(({ icon: Icon, title, blurb, items }) => (
          <section key={title}>
            <div className="mb-1 flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">{title}</h2>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{blurb}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.name}
                  className="rounded-lg border border-border bg-muted/40 p-3"
                >
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Soft CTA out to the deeper stuff. */}
      <div className="panel mt-10 p-5 text-center">
        <p className="text-sm text-muted-foreground">
          Want the deep dive, or curious about something specific?
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            See my projects
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Get in touch
          </Link>
        </div>
      </div>
    </div>
  );
}
