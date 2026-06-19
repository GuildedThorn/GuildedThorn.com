import { useEffect } from "react";

/* Dependency-free per-page <head> manager. Renders nothing; on mount/update it
   sets document.title and upserts the description / Open Graph / Twitter meta
   so each route (and shared blog post / gallery image) gets its own preview. */

const SITE = "GuildedThorn";
const ORIGIN = "https://guildedthorn.com";
const DEFAULT_IMAGE = `${ORIGIN}/images/FullLogo.jpg`;

function upsertMeta(attr: "name" | "property", key: string, content: string) {
	let el = document.head.querySelector<HTMLMetaElement>(
		`meta[${attr}="${key}"]`,
	);
	if (!el) {
		el = document.createElement("meta");
		el.setAttribute(attr, key);
		document.head.appendChild(el);
	}
	el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
	let el = document.head.querySelector<HTMLLinkElement>(
		'link[rel="canonical"]',
	);
	if (!el) {
		el = document.createElement("link");
		el.rel = "canonical";
		document.head.appendChild(el);
	}
	el.href = href;
}

type SeoProps = {
	title: string;
	description?: string;
	/** Absolute URL or site-relative path (e.g. "/images/foo.jpg"). */
	image?: string;
	/** Route path for canonical/og:url. Defaults to the current location. */
	path?: string;
};

export default function Seo({ title, description, image, path }: SeoProps) {
	useEffect(() => {
		const fullTitle = `${title} · ${SITE}`;
		document.title = fullTitle;

		const url = ORIGIN + (path ?? window.location.pathname);
		const img = image
			? image.startsWith("http")
				? image
				: ORIGIN + image
			: DEFAULT_IMAGE;

		if (description) upsertMeta("name", "description", description);
		upsertMeta("property", "og:title", fullTitle);
		if (description) upsertMeta("property", "og:description", description);
		upsertMeta("property", "og:url", url);
		upsertMeta("property", "og:image", img);
		upsertMeta("name", "twitter:title", fullTitle);
		if (description) upsertMeta("name", "twitter:description", description);
		upsertMeta("name", "twitter:image", img);
		upsertCanonical(url);
	}, [title, description, image, path]);

	return null;
}
