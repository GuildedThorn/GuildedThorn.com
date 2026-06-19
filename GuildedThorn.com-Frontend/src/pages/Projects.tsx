import { useEffect, useMemo, useState } from "react";
import { Star, GitFork, ExternalLink, Search, FolderGit2 } from "lucide-react";
import {
	populateProjectData,
	populateRecentProjectData,
} from "@backend/api";
import { Project } from "@backend/types";
import { Input } from "@components/ui/Input";
import { cn } from "@lib/utils";
import Seo from "@components/Seo";

const githubBaseUrl = "https://github.com/GuildedThorn";

const MODES = [
	{ value: "pinned", label: "Pinned" },
	{ value: "recent", label: "Recent" },
] as const;
type Mode = (typeof MODES)[number]["value"];

const SORTS = [
	{ value: "featured", label: "Featured" },
	{ value: "stars", label: "Most stars" },
	{ value: "forks", label: "Most forks" },
	{ value: "name", label: "Name (A–Z)" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

export default function Projects() {
	const [projects, setProjects] = useState<Project[]>([]);
	const [mode, setMode] = useState<Mode>("pinned");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const [query, setQuery] = useState("");
	const [lang, setLang] = useState<string | null>(null);
	const [sort, setSort] = useState<Sort>("featured");

	useEffect(() => {
		const controller = new AbortController();
		(async () => {
			setLoading(true);
			setError("");
			try {
				const data =
					mode === "recent"
						? await populateRecentProjectData(controller.signal)
						: await populateProjectData(controller.signal);
				setProjects(data ?? []);
			} catch {
				if (!controller.signal.aborted) {
					setProjects([]);
					setError("Couldn’t load these repos right now.");
				}
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		})();
		return () => controller.abort();
	}, [mode]);

	// Reset filters whenever the underlying set changes.
	useEffect(() => {
		setQuery("");
		setLang(null);
		setSort("featured");
	}, [mode]);

	const totals = useMemo(
		() => ({
			count: projects.length,
			stars: projects.reduce((s, p) => s + (p.stars || 0), 0),
			forks: projects.reduce((s, p) => s + (p.forks || 0), 0),
		}),
		[projects],
	);

	// Language distribution across the loaded repos.
	const languages = useMemo(() => {
		const map = new Map<string, { count: number; color: string }>();
		for (const p of projects) {
			if (!p.language) continue;
			const cur = map.get(p.language) ?? { count: 0, color: p.languageColor };
			cur.count += 1;
			map.set(p.language, cur);
		}
		return [...map.entries()]
			.map(([name, v]) => ({ name, ...v }))
			.sort((a, b) => b.count - a.count);
	}, [projects]);
	const langTotal = languages.reduce((s, l) => s + l.count, 0);

	const visible = useMemo(() => {
		const q = query.trim().toLowerCase();
		let list = projects.filter((p) => {
			if (lang && p.language !== lang) return false;
			if (!q) return true;
			return (
				p.name.toLowerCase().includes(q) ||
				(p.description ?? "").toLowerCase().includes(q) ||
				(p.language ?? "").toLowerCase().includes(q)
			);
		});
		if (sort === "stars") list = [...list].sort((a, b) => b.stars - a.stars);
		else if (sort === "forks") list = [...list].sort((a, b) => b.forks - a.forks);
		else if (sort === "name")
			list = [...list].sort((a, b) => a.name.localeCompare(b.name));
		return list;
	}, [projects, query, lang, sort]);

	return (
		<div className="page text-left">
			<Seo
				title="Projects"
				description="Things Jamie Duddleston (GuildedThorn) is building on GitHub — searchable, filterable by language, with live stars/forks and a language breakdown."
				path="/projects"
			/>

			<header className="pb-8 text-center sm:pb-12">
				<p className="eyebrow mb-4">Things I've built</p>
				<h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
					Projects
				</h1>
				<p className="mx-auto mt-4 max-w-2xl text-balance text-lg text-muted-foreground">
					A live, searchable index of my GitHub work — filter by language, sort
					by stars, and see the tech mix at a glance.
				</p>
			</header>

			{/* Pinned / Recent source toggle */}
			<div className="mb-5 flex items-center justify-center">
				<div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
					{MODES.map((m) => (
						<button
							key={m.value}
							onClick={() => setMode(m.value)}
							className={cn(
								"rounded-md px-3 py-1 text-sm font-medium transition-colors",
								mode === m.value
									? "bg-primary text-primary-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{m.label}
						</button>
					))}
				</div>
			</div>

			{/* Aggregate stats + language breakdown */}
			{!loading && !error && projects.length > 0 ? (
				<div className="panel mb-6 p-4 sm:p-5">
					<div className="flex flex-wrap items-center gap-x-6 gap-y-2">
						<span className="flex items-center gap-2 font-semibold">
							<FolderGit2 className="h-4 w-4 text-primary" />
							{totals.count} repos
						</span>
						<span className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
							<Star className="h-4 w-4" /> {totals.stars} stars
						</span>
						<span className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
							<GitFork className="h-4 w-4" /> {totals.forks} forks
						</span>
					</div>

					{langTotal > 0 && (
						<>
							<div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted">
								{languages.map((l) => (
									<div
										key={l.name}
										style={{
											width: `${(l.count / langTotal) * 100}%`,
											backgroundColor: l.color,
										}}
										title={`${l.name} · ${l.count}`}
									/>
								))}
							</div>
							<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
								{languages.map((l) => (
									<span key={l.name} className="flex items-center gap-1.5">
										<span
											className="h-2.5 w-2.5 rounded-full"
											style={{ backgroundColor: l.color }}
										/>
										{l.name}
									</span>
								))}
							</div>
						</>
					)}
				</div>
			) : null}

			{/* Search + sort + language filter */}
			{!loading && !error && projects.length > 0 ? (
				<div className="mb-5 flex flex-col gap-3">
					<div className="flex flex-col gap-3 sm:flex-row">
						<div className="relative flex-1">
							<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search repos…"
								className="pl-9"
								aria-label="Search repositories"
							/>
						</div>
						<select
							value={sort}
							onChange={(e) => setSort(e.target.value as Sort)}
							aria-label="Sort"
							className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
						>
							{SORTS.map((s) => (
								<option key={s.value} value={s.value}>
									{s.label}
								</option>
							))}
						</select>
					</div>

					{languages.length > 1 && (
						<div className="flex flex-wrap gap-1.5">
							<button
								onClick={() => setLang(null)}
								className={cn(
									"rounded-full border px-3 py-1 text-xs font-medium transition-colors",
									lang === null
										? "border-primary bg-primary text-primary-foreground"
										: "border-border text-muted-foreground hover:text-foreground",
								)}
							>
								All
							</button>
							{languages.map((l) => (
								<button
									key={l.name}
									onClick={() => setLang(lang === l.name ? null : l.name)}
									className={cn(
										"flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
										lang === l.name
											? "border-primary bg-primary text-primary-foreground"
											: "border-border text-muted-foreground hover:text-foreground",
									)}
								>
									<span
										className="h-2 w-2 rounded-full"
										style={{ backgroundColor: l.color }}
									/>
									{l.name}
								</button>
							))}
						</div>
					)}
				</div>
			) : null}

			{error && !loading ? (
				<p className="text-center text-sm text-muted-foreground">{error}</p>
			) : null}

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{loading
					? Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="tile flex flex-col gap-3 p-4">
								<div className="h-4 w-32 animate-pulse rounded bg-muted-foreground/20" />
								<div className="h-3 w-full animate-pulse rounded bg-muted-foreground/20" />
								<div className="h-3 w-24 animate-pulse rounded bg-muted-foreground/20" />
							</div>
						))
					: visible.map((project) => (
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

			{!loading && !error && projects.length > 0 && visible.length === 0 ? (
				<p className="mt-2 text-center text-sm text-muted-foreground">
					No repos match your filters.
				</p>
			) : null}

			{!loading && !error && projects.length === 0 ? (
				<p className="mt-2 text-center text-sm text-muted-foreground">
					No repos to show right now.
				</p>
			) : null}
		</div>
	);
}
