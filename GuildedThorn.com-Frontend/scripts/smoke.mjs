// Production-bundle browser smoke test.
//
// Unit tests run through Vite's transform, NOT the production bundle, so they
// can't catch bundler-specific breakage (e.g. the Vite 8 / rolldown CJS
// default-interop bug that white-screened the home page with React #306). This
// builds the real bundle, serves it, and loads every public route in a headless
// browser, failing on any React-breaking error or rendered error boundary. It
// also scrolls each page so IntersectionObserver-gated content (LazyOnVisible,
// e.g. the GitHub calendar) actually renders.
//
// Backend-less: app data fetches (no API/SignalR) are expected to fail and are
// ignored; only React render breaks fail the run.
//
// Usage:
//   CHROMIUM=/path/to/chromium bun run smoke
// CHROMIUM defaults to $CHROMIUM, then `chromium`/`google-chrome-stable` on PATH.
// On Nix: CHROMIUM=$(nix build nixpkgs#chromium --no-link --print-out-paths)/bin/chromium

import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { createRequire } from "node:module";

// The preview server uses a self-signed cert (basic-ssl); accept it for the
// localhost-only readiness check and the browser context.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const PORT = 4173;
const BASE = `https://localhost:${PORT}`;
const DIST = "node_modules/.smoke-dist"; // throwaway, already git-ignored

const routes = [
	"/", "/login", "/register", "/contact", "/net", "/stream", "/tools",
	"/privacy", "/cookies", "/resume", "/projects", "/uses",
	"/blog/pages", "/gallery/images",
];

const isReactBreak = (t) =>
	/Minified React error|element type is invalid|Rendered (more|fewer) hooks|Maximum update depth|Cannot read properties of undefined \(reading '(createContext|useContext)'\)/i.test(t);

function findChromium() {
	if (process.env.CHROMIUM && existsSync(process.env.CHROMIUM)) return process.env.CHROMIUM;
	for (const c of ["chromium", "chromium-browser", "google-chrome-stable", "google-chrome"]) {
		try {
			return execSync(`command -v ${c}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
		} catch {
			/* keep looking */
		}
	}
	throw new Error("No Chromium found. Set CHROMIUM=/path/to/chromium (see header).");
}

async function waitForServer(timeoutMs = 20000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`${BASE}/`);
			if (res.ok) return;
		} catch {
			/* not up yet */
		}
		await sleep(300);
	}
	throw new Error("preview server did not start");
}

const exe = findChromium();
console.log(`chromium: ${exe}`);
console.log("building production bundle…");
execSync(`npx vite build --outDir ${DIST} --emptyOutDir`, { stdio: "inherit" });

const preview = spawn("npx", ["vite", "preview", "--outDir", DIST, "--port", String(PORT), "--strictPort"], {
	stdio: "ignore",
});
let failures = 0;
try {
	await waitForServer();
	const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
	const context = await browser.newContext({ ignoreHTTPSErrors: true });

	for (const route of routes) {
		const page = await context.newPage();
		const errors = [];
		page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
		page.on("console", (m) => {
			if (m.type() === "error" && isReactBreak(m.text())) errors.push(`console.error: ${m.text()}`);
		});

		let mounted = false, boundary = false;
		try {
			await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 15000 });
			await page.evaluate(async () => {
				for (let y = 0; y <= document.body.scrollHeight; y += 400) {
					window.scrollTo(0, y);
					await new Promise((r) => setTimeout(r, 60));
				}
			});
			await page.waitForTimeout(1500);
			mounted = await page.evaluate(() => {
				const r = document.getElementById("root");
				return !!r && r.innerText.trim().length > 0;
			});
			boundary = await page.evaluate(() =>
				/Unexpected Application Error|errorElement|Hey developer/i.test(document.body.innerText),
			);
		} catch (e) {
			errors.push(`navigation: ${e.message}`);
		}

		const ok = mounted && !boundary && errors.length === 0;
		if (!ok) failures++;
		console.log(`${ok ? "PASS" : "FAIL"}  ${route}  (mounted=${mounted} errorBoundary=${boundary} errors=${errors.length})`);
		for (const e of errors.slice(0, 4)) console.log(`        ${e}`);
		await page.close();
	}
	await browser.close();
} finally {
	preview.kill();
}

console.log(`\n${failures === 0 ? "ALL PASS ✅" : failures + " ROUTE(S) FAILED ❌"}`);
process.exit(failures === 0 ? 0 : 1);
