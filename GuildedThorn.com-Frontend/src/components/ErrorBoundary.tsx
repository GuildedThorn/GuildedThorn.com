import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@components/ui/Button";

const RELOAD_FLAG = "chunk-reload-attempt";

/* A stale deploy can leave a user's cached index.html pointing at hashed chunk
   URLs that no longer exist; the dynamic import then throws. Detect that and
   reload once to pull the fresh manifest. */
function isChunkLoadError(error: unknown): boolean {
	const msg = error instanceof Error ? error.message : String(error);
	return /Loading chunk|dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
		msg,
	);
}

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false };

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	componentDidMount() {
		// If we survive a few seconds, treat the load as healthy and allow a
		// future chunk error to trigger one more reload.
		setTimeout(() => {
			try {
				sessionStorage.removeItem(RELOAD_FLAG);
			} catch {
				/* ignore */
			}
		}, 5000);
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		if (isChunkLoadError(error)) {
			let alreadyReloaded = false;
			try {
				alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
				sessionStorage.setItem(RELOAD_FLAG, "1");
			} catch {
				/* ignore */
			}
			if (!alreadyReloaded) {
				window.location.reload();
				return;
			}
		}
		console.error("ErrorBoundary caught an error:", error, info);
	}

	render() {
		if (!this.state.hasError) return this.props.children;

		return (
			<div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center text-foreground">
				<p className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text font-mono text-6xl font-bold tracking-tight text-transparent">
					oops
				</p>
				<h1 className="mt-4 text-2xl font-semibold">Something broke.</h1>
				<p className="mt-2 max-w-md text-balance text-muted-foreground">
					An unexpected error knocked this page over. Reloading usually sorts it
					out.
				</p>
				<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
					<Button onClick={() => window.location.reload()}>Reload</Button>
					<a href="/">
						<Button variant="outline">Back home</Button>
					</a>
				</div>
			</div>
		);
	}
}
