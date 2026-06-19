import { Link } from "react-router-dom";
import { Home, Mail } from "lucide-react";
import { Button } from "@components/ui/Button";
import Seo from "@components/Seo";

export default function NotFound() {
	return (
		<div className="page">
			<Seo
				title="404 — Page not found"
				description="This page wandered off."
			/>
			<div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
				<p className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text font-mono text-7xl font-bold tracking-tight text-transparent sm:text-8xl">
					404
				</p>
				<h1 className="mt-4 text-2xl font-semibold sm:text-3xl">
					This page wandered off.
				</h1>
				<p className="mx-auto mt-2 max-w-md text-balance text-muted-foreground">
					The link may be broken, or the page may have moved. Let's get you back
					on track.
				</p>
				<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
					<Link to="/">
						<Button>
							<Home className="h-4 w-4" />
							Back home
						</Button>
					</Link>
					<Link to="/contact">
						<Button variant="outline">
							<Mail className="h-4 w-4" />
							Contact
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
