import { Mail, Github, Globe, Printer } from "lucide-react";
import { Button } from "@components/ui/Button";
import Seo from "@components/Seo";

const contacts = [
  {
    icon: <Mail className="h-4 w-4" />,
    label: "jamieduddleston2@gmail.com",
    href: "mailto:jamieduddleston2@gmail.com",
  },
  {
    icon: <Github className="h-4 w-4" />,
    label: "github.com/GuildedThorn",
    href: "https://github.com/GuildedThorn",
  },
  {
    icon: <Globe className="h-4 w-4" />,
    label: "guildedthorn.com",
    href: "https://guildedthorn.com",
  },
];

type Job = {
  company: string;
  employment: string;
  roles?: { title: string; period: string; points: string[] }[];
  points?: string[];
};

const experience: Job[] = [
  {
    company: "White Castle",
    employment: "Full-time · 2 yrs 5 mos",
    roles: [
      {
        title: "Manager",
        period: "Oct 2025 – Present · 9 mos",
        points: [
          "Run daily restaurant operations and lead the crew across shifts — scheduling, training, and service quality.",
          "Oversee cash handling, inventory, and food-safety standards in a high-volume quick-service environment.",
        ],
      },
      {
        title: "Crew Member",
        period: "Feb 2024 – Oct 2025 · 1 yr 9 mos",
        points: [
          "Prepared food to brand standards and delivered fast, friendly customer service.",
          "Kept the line stocked and the store clean, meeting health & safety standards during peak rushes.",
        ],
      },
    ],
  },
  {
    company: "Portillo's",
    employment: "Feb 2023 - Jan 2024",
    points: [
      "Closed restaurant by cleaning dishes, cutting bread, cooking bacon, cleaning back/coolers and freezers of restaurant on a 5pm to 2am basis.",
      "Cooked and Prepared burgers, chicken and fish sandwiches in situations where restaurant boomed.",
    ],
  },
  {
    company: "Geek Squad",
    employment: "Oct 2021 - Jan 2022 - 4 mos (Seasonal)",
    points: [
      "Assisted the customer with hardware and software related issues pertaining to the device they purchased.",
      "Completed numerous functionality checks before products were put onto the floor for the customer to purchase.",
      "Time and Work Space intensive environment.",
    ],
  },
];

const education = [
  {
    degree: "High School",
    year: "2021",
    school: "Kennedy High School",
  },
  {
    degree: "Bootcamp",
    year: "2022 - 2023",
    school: "New Apprenticeship; IT ServiceNow",
  },
];

const skills = [
  {
    group: "Languages",
    items: ["C#", "TypeScript", "JavaScript", "Java", "SQL"],
  },
  { group: "Frontend", items: ["React", "Vite", "Tailwind CSS", "HTML / CSS"] },
  {
    group: "Backend",
    items: ["ASP.NET Core", "REST APIs", "SignalR", "JWT auth"],
  },
  { group: "Data", items: ["MongoDB", "SQL"] },
  {
    group: "DevOps & Infra",
    items: ["Docker", "Nix / NixOS", "Linux", "Git", "RabbitMQ"],
  },
  { group: "Tools", items: ["JetBrains IDEs", "Neovim"] },
];

const projects = [
  {
    name: "GuildedThorn.com",
    link: "guildedthorn.com",
    href: "https://guildedthorn.com",
    blurb:
      "Full-stack personal site & platform — ASP.NET Core 9 API + React / TypeScript / Vite SPA.",
    points: [
      "JWT cookie auth with owner/user roles, MongoDB persistence, and RabbitMQ messaging.",
      "Real-time chat and a live radio player over SignalR + Icecast.",
      "Markdown blog with tag filtering and an RSS feed; image gallery with EXIF metadata, bulk/folder upload, and tag search.",
      "Integrations: Spotify / stats.fm, GitHub, Discord (Lanyard), Twitch; cookie-consent CMP.",
      "Dockerized with reproducible builds and deployment via Nix flakes.",
    ],
  },
];

const interests = [
  "Homelab & networking — pfSense, SDR / HackRF, Flipper Zero",
  "Photography",
  "Live streaming",
  "Audio engineering & car builds",
];

export default function Resume() {
  return (
    <div className="page text-left">
      <Seo
        title="Résumé"
        description="Résumé of Jamie Duddleston — full-stack software developer (ASP.NET Core, React, TypeScript)."
        path="/resume"
      />
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6 print:pb-4">
        <div>
          <h1 className="text-3xl print:text-2xl">Jamie Duddleston</h1>
          <p className="mt-1 text-lg text-muted-foreground">
            Software Developer
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {contacts.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-foreground/80 transition-colors hover:text-primary"
              >
                {c.icon}
                {c.label}
              </a>
            ))}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="shrink-0 print:hidden"
        >
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </Button>
      </header>

      {/* Summary */}
      <section className="mt-6 print:mt-4">
        <p className="text-sm leading-relaxed text-foreground/90">
          Full-stack software developer who builds end-to-end products — from
          typed React frontends to ASP.NET Core APIs, real-time services, and
          the infrastructure that runs them. Comfortable across the stack and
          the toolchain, with a homelab/security background and a habit of
          shipping polished, self-hosted projects.
        </p>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-3 print:mt-5 print:grid-cols-3 print:gap-6">
        {/* Main column */}
        <div className="space-y-8 lg:col-span-2 print:col-span-2 print:space-y-5">
          <section>
            <h2 className="eyebrow mb-3 print:mb-2">Experience</h2>
            <div className="space-y-6 print:space-y-3">
              {experience.map((job) => (
                <div key={job.company}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{job.company}</p>
                    <p className="text-sm text-muted-foreground">
                      {job.employment}
                    </p>
                  </div>
                  <div className="mt-3 space-y-4 border-l border-border pl-4">
                    {job.roles?.map((role) => (
                      <div key={role.title}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-medium">{role.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {role.period}
                          </p>
                        </div>
                        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-foreground/90">
                          {role.points.map((pt) => (
                            <li key={pt}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {job.points && (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/90">
                        {job.points.map((pt) => (
                          <li key={pt}>{pt}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="eyebrow mb-3 print:mb-2">Projects</h2>
            <div className="space-y-5 print:space-y-3">
              {projects.map((p) => (
                <div key={p.name}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{p.name}</p>
                    <a
                      href={p.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {p.link}
                    </a>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.blurb}</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-foreground/90">
                    {p.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="eyebrow mb-3 print:mb-2">Education</h2>
            <div className="space-y-4">
              {education.map((ed) => (
                <div key={ed.school}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{ed.degree}</p>
                    <p className="text-sm text-muted-foreground">{ed.year}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{ed.school}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-8 print:space-y-5">
          <section>
            <h2 className="eyebrow mb-3 print:mb-2">Skills</h2>
            <div className="space-y-3">
              {skills.map((s) => (
                <div key={s.group}>
                  <p className="text-sm font-semibold">{s.group}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.items.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="eyebrow mb-3 print:mb-2">Interests</h2>
            <ul className="space-y-1 text-sm text-foreground/90">
              {interests.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
