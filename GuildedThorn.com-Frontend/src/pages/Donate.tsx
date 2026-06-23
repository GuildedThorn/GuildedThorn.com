import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Heart, Check, X, HandCoins } from "lucide-react";
import { Button } from "@components/ui/Button";
import TextInput from "@components/ui/TextInput";
import { Textarea } from "@components/ui/TextArea";
import { cn } from "@lib/utils";
import {
	getDonationConfig,
	startDonationCheckout,
	type DonationConfig,
} from "@backend/api";
import Seo from "@components/Seo";

const CUSTOM = "custom" as const;

function Donate() {
	const [config, setConfig] = useState<DonationConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [params] = useSearchParams();
	const status = params.get("status"); // "success" | "cancel" | null

	const [selected, setSelected] = useState<number | typeof CUSTOM>(0);
	const [custom, setCustom] = useState("");
	const [name, setName] = useState("");
	const [message, setMessage] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		let alive = true;
		getDonationConfig()
			.then((c) => {
				if (!alive) return;
				setConfig(c);
				setSelected(c.presets[0] ?? CUSTOM);
			})
			.catch(() => alive && setConfig(null))
			.finally(() => alive && setLoading(false));
		return () => {
			alive = false;
		};
	}, []);

	const money = useMemo(
		() =>
			new Intl.NumberFormat(undefined, {
				style: "currency",
				currency: (config?.currency ?? "usd").toUpperCase(),
				maximumFractionDigits: 0,
			}),
		[config?.currency],
	);

	// Resolve the chosen amount to cents (custom is entered in whole currency units).
	const amountCents =
		selected === CUSTOM ? Math.round((parseFloat(custom) || 0) * 100) : selected;

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError("");
		if (amountCents < 100) {
			setError("Please enter an amount of at least 1.");
			return;
		}
		setSubmitting(true);
		try {
			await startDonationCheckout({ amountCents, name, message });
			// On success the browser is redirected to Stripe — nothing more to do.
		} catch (err) {
			setSubmitting(false);
			setError(
				err instanceof Error ? err.message : "Something went wrong. Try again.",
			);
		}
	};

	return (
		<div className="page">
			<Seo
				title="Donate"
				description="Support GuildedThorn — one-time donations help keep the stream, radio, and site running."
				path="/donate"
			/>

			<header className="pb-10 text-center sm:pb-14">
				<p className="eyebrow mb-4">Support the work</p>
				<h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
					Buy me a{" "}
					<span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
						coffee
					</span>
				</h1>
				<p className="mx-auto mt-4 max-w-2xl text-balance text-lg text-muted-foreground">
					Donations help keep the stream, radio, and this site running. Every
					bit is appreciated — thank you.
				</p>
			</header>

			<section className="mx-auto max-w-2xl">
				{/* Post-checkout banners (the redirect is cosmetic — the real record
				    comes from Stripe's webhook). */}
				{status === "success" && (
					<div className="panel mb-6 flex items-center gap-3 border-success/40 p-4 text-left">
						<span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-success/10 text-success">
							<Check className="h-5 w-5" />
						</span>
						<p className="text-sm">
							Thank you so much for your support — it means a lot. 💛
						</p>
					</div>
				)}
				{status === "cancel" && (
					<div className="panel mb-6 flex items-center gap-3 border-border p-4 text-left">
						<span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
							<X className="h-5 w-5" />
						</span>
						<p className="text-sm text-muted-foreground">
							Checkout was cancelled — no charge was made.
						</p>
					</div>
				)}

				{loading ? (
					<div className="panel p-8 text-center text-muted-foreground">
						Loading…
					</div>
				) : !config?.enabled || !config?.configured ? (
					<div className="panel p-8 text-center">
						<span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
							<HandCoins className="h-7 w-7" />
						</span>
						<h2 className="mt-4 text-2xl font-semibold">Coming soon</h2>
						<p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
							Donations aren't open just yet — check back soon.
						</p>
					</div>
				) : (
					<form onSubmit={onSubmit} className="panel p-6 text-left sm:p-8">
						<label className="field-label">Choose an amount</label>
						<div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
							{config.presets.map((cents) => (
								<button
									key={cents}
									type="button"
									onClick={() => setSelected(cents)}
									className={cn(
										"rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:border-primary/40",
										selected === cents &&
											"border-primary bg-primary/10 text-primary",
									)}
								>
									{money.format(cents / 100)}
								</button>
							))}
							<button
								type="button"
								onClick={() => setSelected(CUSTOM)}
								className={cn(
									"rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:border-primary/40",
									selected === CUSTOM &&
										"border-primary bg-primary/10 text-primary",
								)}
							>
								Custom
							</button>
						</div>

						{selected === CUSTOM && (
							<TextInput
								id="custom-amount"
								label="Amount"
								type="number"
								placeholder="25"
								value={custom}
								onChange={(e) => setCustom(e.target.value)}
							/>
						)}

						<TextInput
							id="donor-name"
							label="Name (optional)"
							placeholder="Anonymous"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>

						<div className="mb-4 text-left">
							<label htmlFor="donor-message" className="field-label">
								Message (optional)
							</label>
							<Textarea
								id="donor-message"
								name="message"
								rows={3}
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder="Say hi…"
							/>
						</div>

						{error && <p className="mb-3 text-sm text-destructive">{error}</p>}

						<Button type="submit" disabled={submitting} className="w-full">
							<Heart className="h-4 w-4" />
							{submitting
								? "Redirecting…"
								: amountCents >= 100
									? `Donate ${money.format(amountCents / 100)}`
									: "Donate"}
						</Button>
						<p className="mt-3 text-center text-xs text-muted-foreground">
							Secure checkout powered by Stripe. You'll be redirected to
							complete your donation.
						</p>
					</form>
				)}
			</section>
		</div>
	);
}

export default Donate;
