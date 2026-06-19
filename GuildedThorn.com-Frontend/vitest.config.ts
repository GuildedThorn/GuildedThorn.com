import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Standalone test config (kept separate from vite.config so the Tailwind plugin
// doesn't run in tests). jsdom + the path aliases let us render real components.
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@components": r("./src/components"),
			"@routes": r("./src/routes"),
			"@styles": r("./src/styles"),
			"@assets": r("./src/assets"),
			"@backend": r("./src/backend"),
			"@layouts": r("./src/layouts"),
			"@pages": r("./src/pages"),
			"@lib": r("./src/lib"),
		},
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./vitest.setup.ts"],
		include: ["src/**/*.test.{ts,tsx}"],
		css: false,
	},
});
