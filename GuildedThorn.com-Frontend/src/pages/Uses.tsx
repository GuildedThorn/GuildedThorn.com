import {
  Terminal,
  Code2,
  Cpu,
  Headphones,
  RadioTower,
  Laptop,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// /uses — a single self-contained "what I run" page (uses.tech convention).
//
// To remove this feature entirely, delete this file and its two lines in
// AppRoutes.tsx (the `const Uses = lazy(...)` import and the <Route path="uses">).
// Nothing else references it.
//
// To edit it, just change the `sections` array below — it's plain data.
// ─────────────────────────────────────────────────────────────────────────────

const LAST_UPDATED = "June 2026";

interface UseItem {
  name: string;
  detail?: string;
}

interface UseSection {
  icon: typeof Terminal;
  title: string;
  blurb?: string;
  items: UseItem[];
}

const sections: UseSection[] = [
  {
    icon: Terminal,
    title: "Editor & Shell",
    blurb: "Where I actually spend the day.",
    items: [
      { name: "Neovim", detail: "Opinionated, heavy config — my main editor" },
      { name: "NixOS", detail: "Daily driver — see ThornixOS for my config" },
      { name: "zsh" },
      { name: "git" },
    ],
  },
  {
    icon: Code2,
    title: "Languages & Stack",
    blurb: "Frontend, backend, you name it.",
    items: [
      { name: "C#", detail: "ASP.NET Core — my main backend language" },
      { name: "TypeScript", detail: "React + Vite on the frontend" },
      { name: "C / C++", detail: "When I want to get closer to the metal" },
      { name: "Nix", detail: "Reproducible builds + this site's deploy" },
    ],
  },
  {
    icon: Cpu,
    title: "Main Rig",
    items: [
      { name: "Ryzen 9 5900X" },
      { name: "32GB Corsair Vengeance RGB" },
      { name: "MSI RX 6700XT 2X Mech OC" },
      { name: "EVGA 850W" },
      { name: "2TB Samsung 980 EVO + 2TB Crucial NVMe" },
    ],
  },
  {
    icon: Headphones,
    title: "Audio",
    blurb: "The room I do most of my listening in.",
    items: [
      { name: "Pioneer RX-V765 receiver" },
      { name: "JBL N-Center + Klipsch KSF-C5", detail: "Center" },
      { name: "Kicker CompVR / CompC subs" },
      { name: "Power Acoustik + Pioneer + Skar amps" },
    ],
  },
  {
    icon: RadioTower,
    title: "SDR & Security",
    blurb: "Defensive / educational tinkering.",
    items: [
      { name: "Flipper Zero" },
      { name: "2× HackRF", detail: "One with PortaPack H2" },
      { name: "RTL-SDR", detail: "Bias Tee 5V FM LNA" },
      { name: "Kali Linux" },
    ],
  },
  {
    icon: Laptop,
    title: "Everyday Devices",
    items: [
      { name: "2011 MacBook Pro", detail: "macOS Sonoma (OpenCore) + Kali" },
      { name: '2021 iPad Pro 11"' },
      { name: "iPhone 11" },
      { name: "Steam Deck 1TB" },
      { name: "TicWatch Pro 3 GPS" },
    ],
  },
];

export default function Uses() {
  return (
    <div className="page text-left">
      <h1 className="text-3xl">/uses</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The hardware and software I actually use. Updated {LAST_UPDATED}.
      </p>
      <p className="mt-4 text-muted-foreground">
        People ask about my setup a lot, so here it is in one place — inspired by{" "}
        <a
          className="text-primary hover:underline"
          href="https://uses.tech"
          target="_blank"
          rel="noopener noreferrer"
        >
          uses.tech
        </a>
        .
      </p>

      <div className="mt-8 space-y-8">
        {sections.map(({ icon: Icon, title, blurb, items }) => (
          <section key={title}>
            <div className="mb-3 flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">{title}</h2>
            </div>
            {blurb && (
              <p className="mb-3 text-sm text-muted-foreground">{blurb}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.name}
                  className="rounded-lg border border-border bg-muted/40 p-3"
                >
                  <p className="font-medium">{item.name}</p>
                  {item.detail && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {item.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
