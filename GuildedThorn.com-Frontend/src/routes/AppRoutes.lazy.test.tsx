import { describe, it, expect } from "vitest";
import { Suspense, lazy } from "react";
import { render, screen } from "@testing-library/react";
import { isValidElementType } from "react-is";

// Guards against the "white-screen" class of bugs where a lazy route component
// resolves to something React can't render — a missing/renamed default export,
// a wrong import path, or a module whose default isn't a component. React throws
// minified error #306 ("element type is invalid") at render time, which only
// surfaces once that route is actually visited in the browser. These tests fail
// fast in CI instead.
//
// NOTE: vitest runs through Vite's transform, NOT the production bundle, so this
// can't reproduce bundler-specific interop bugs (e.g. the Vite 8 / rolldown
// default-interop regression). That needs a built-bundle browser smoke test.
// This covers source-level lazy/default-export breakage only.

// Mirror of every lazy(() => import(...)) in AppRoutes.tsx. Keep in sync when
// routes are added or removed.
const routeModules: ReadonlyArray<
	[name: string, importer: () => Promise<{ default: unknown }>]
> = [
	["App", () => import("@pages/App.tsx")],
	["Stream", () => import("@pages/Stream.tsx")],
	["Contact", () => import("@pages/Contact.tsx")],
	["Radio", () => import("@pages/Radio.tsx")],
	["Login", () => import("@pages/Login.tsx")],
	["Register", () => import("@pages/Register.tsx")],
	["GuestBook", () => import("@components/GuestBook.tsx")],
	["UserSettings", () => import("@pages/UserSettings.tsx")],
	["ThornNet", () => import("@pages/ThornNet.tsx")],
	["BlogLayout", () => import("@layouts/BlogLayout.tsx")],
	["BlogList", () => import("@components/Blog/BlogList")],
	["BlogPost", () => import("@components/Blog/BlogPost.tsx")],
	["BlogUpload", () => import("@pages/BlogUpload.tsx")],
	["GalleryUpload", () => import("@pages/GalleryUpload.tsx")],
	["GalleryList", () => import("@components/Gallery/GalleryList.tsx")],
	["GalleryLayout", () => import("@layouts/GalleryLayout.tsx")],
	["Tools", () => import("@pages/Tools.tsx")],
	["PrivacyPolicy", () => import("@pages/PrivacyPolicy.tsx")],
	["CookiePolicy", () => import("@pages/CookiePolicy.tsx")],
	["Resume", () => import("@pages/Resume.tsx")],
	["Projects", () => import("@pages/Projects.tsx")],
	["Inbox", () => import("@pages/Inbox.tsx")],
	["NotFound", () => import("@pages/NotFound.tsx")],
	["Uses", () => import("@pages/Uses.tsx")],
];

describe("lazy route modules", () => {
	it.each(routeModules)(
		"%s resolves to a renderable default component",
		async (_name, importer) => {
			const mod = await importer();
			expect(mod).toHaveProperty("default");
			// isValidElementType accepts function/class components and the
			// memo/forwardRef/lazy object wrappers, but rejects a plain module
			// object (the shape that triggers #306).
			expect(isValidElementType(mod.default)).toBe(true);
		},
	);

	// Exercises the real React.lazy + Suspense render path end-to-end: a lazy
	// element that resolves to a non-component would throw #306 here. Resume is
	// used because it pulls in no router/auth context.
	it("mounts a lazily-loaded route through Suspense without throwing", async () => {
		const Resume = lazy(() => import("@pages/Resume.tsx"));
		render(
			<Suspense fallback={<div>loading</div>}>
				<Resume />
			</Suspense>,
		);
		expect(
			await screen.findByRole("heading", { name: /Jamie Duddleston/i }),
		).toBeTruthy();
	});
});
