import { useState, type ChangeEvent, type FormEvent } from "react";
import { Mail, Copy, Check, KeyRound, ArrowUpRight, Send } from "lucide-react";
import {
	FaLinkedin,
	FaDiscord,
	FaXTwitter,
	FaYoutube,
	FaGithub,
} from "react-icons/fa6";
import { Button } from "@components/ui/Button";
import TextInput from "@components/ui/TextInput";
import { Textarea } from "@components/ui/TextArea";
import { cn } from "@lib/utils";
import { sendContactMessage } from "@backend/api";
import Seo from "@components/Seo";

const EMAIL = "admin@guildedthorn.com";

const socials = [
	{
		label: "LinkedIn",
		handle: "Jamie Duddleston",
		href: "https://www.linkedin.com/in/jamie-duddleston-702768336/",
		icon: <FaLinkedin />,
		color: "text-sky-500",
	},
	{
		label: "Discord",
		handle: "GuildedThorn",
		href: "https://discord.com/users/654849939175768074",
		icon: <FaDiscord />,
		color: "text-indigo-400",
	},
	{
		label: "X / Twitter",
		handle: "@GuildedThorn",
		href: "https://twitter.com/GuildedThorn",
		icon: <FaXTwitter />,
		color: "text-foreground",
	},
	{
		label: "YouTube",
		handle: "GuildedThorn",
		href: "https://www.youtube.com/@GuildedThorn",
		icon: <FaYoutube />,
		color: "text-red-500",
	},
	{
		label: "GitHub",
		handle: "github.com/GuildedThorn",
		href: "https://github.com/GuildedThorn",
		icon: <FaGithub />,
		color: "text-blue-400",
	},
];

function Contact() {
	const [copied, setCopied] = useState(false);

	const copyEmail = async () => {
		try {
			await navigator.clipboard.writeText(EMAIL);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			/* clipboard unavailable — the mailto button still works */
		}
	};

	const [form, setForm] = useState({ name: "", email: "", message: "" });
	const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
		"idle",
	);
	const [errorMsg, setErrorMsg] = useState("");

	const update =
		(key: "name" | "email" | "message") =>
		(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
			setForm((f) => ({ ...f, [key]: e.target.value }));

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setStatus("sending");
		setErrorMsg("");
		try {
			await sendContactMessage(form);
			setStatus("sent");
			setForm({ name: "", email: "", message: "" });
		} catch (err) {
			setStatus("error");
			setErrorMsg(
				err instanceof Error ? err.message : "Something went wrong. Try again.",
			);
		}
	};

	return (
		<div className="page">
			<Seo
				title="Contact"
				description="Get in touch with Jamie Duddleston (GuildedThorn) — email, LinkedIn, Discord, GitHub, and more."
				path="/contact"
			/>
			{/* Hero */}
			<header className="pb-10 text-center sm:pb-14">
				<p className="eyebrow mb-4">Get in touch</p>
				<h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
					Let's build something{" "}
					<span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
						worth making
					</span>
				</h1>
				<p className="mx-auto mt-4 max-w-2xl text-balance text-lg text-muted-foreground">
					Questions, feedback, partnership ideas, or a job offer — I'm one
					message away. Email is best for anything serious; otherwise, find me
					around the web.
				</p>
			</header>

			{/* Featured: email */}
			<section className="mx-auto max-w-2xl">
				<div className="panel p-6 text-center sm:p-8">
					<span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
						<Mail className="h-7 w-7" />
					</span>
					<h2 className="mt-4 text-2xl font-semibold">Email me</h2>
					<p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
						The best way to reach me for hiring, partnerships, or anything that
						needs a real reply.
					</p>

					<div className="mx-auto mt-5 flex max-w-sm items-center gap-2">
						<code className="flex-1 truncate rounded-lg border border-border bg-muted px-3 py-2 text-left font-mono text-sm">
							{EMAIL}
						</code>
						<Button
							variant="outline"
							size="icon"
							onClick={copyEmail}
							aria-label="Copy email address"
							title={copied ? "Copied!" : "Copy email"}
						>
							{copied ? (
								<Check className="h-4 w-4 text-success" />
							) : (
								<Copy className="h-4 w-4" />
							)}
						</Button>
					</div>

					<div className="mt-5 flex flex-wrap items-center justify-center gap-3">
						<a href={`mailto:${EMAIL}`}>
							<Button>
								<Mail className="h-4 w-4" />
								Send an email
							</Button>
						</a>
						<a
							href="/public/GuildedThorn.pub"
							target="_blank"
							rel="noopener noreferrer"
						>
							<Button variant="outline">
								<KeyRound className="h-4 w-4" />
								PGP public key
							</Button>
						</a>
					</div>
				</div>
			</section>

			{/* Message form */}
			<section className="mx-auto mt-8 max-w-2xl">
				<div className="panel p-6 text-left sm:p-8">
					<h2 className="text-center text-2xl font-semibold">Send a message</h2>
					<p className="mx-auto mb-6 mt-1.5 max-w-md text-center text-sm text-muted-foreground">
						Prefer a form? Leave your details and I'll get back to you.
					</p>

					{status === "sent" ? (
						<div className="flex flex-col items-center gap-3 py-6 text-center">
							<span className="grid h-12 w-12 place-items-center rounded-full bg-success/10 text-success">
								<Check className="h-6 w-6" />
							</span>
							<p className="font-medium">Thanks — your message is on its way.</p>
							<Button variant="outline" onClick={() => setStatus("idle")}>
								Send another
							</Button>
						</div>
					) : (
						<form onSubmit={onSubmit} noValidate>
							<TextInput
								id="name"
								label="Name"
								value={form.name}
								onChange={update("name")}
								placeholder="Your name"
							/>
							<TextInput
								id="email"
								label="Email"
								type="email"
								value={form.email}
								onChange={update("email")}
								placeholder="you@example.com"
							/>
							<div className="mb-4 text-left">
								<label htmlFor="message" className="field-label">
									Message
								</label>
								<Textarea
									id="message"
									name="message"
									rows={5}
									value={form.message}
									onChange={update("message")}
									placeholder="What's on your mind?"
								/>
							</div>

							{status === "error" ? (
								<p className="mb-3 text-sm text-destructive">{errorMsg}</p>
							) : null}

							<Button
								type="submit"
								disabled={status === "sending"}
								className="w-full"
							>
								<Send className="h-4 w-4" />
								{status === "sending" ? "Sending…" : "Send message"}
							</Button>
						</form>
					)}
				</div>
			</section>

			{/* Socials */}
			<section className="mt-12">
				<p className="eyebrow mb-4 text-center">Find me around the web</p>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{socials.map(({ label, handle, href, icon, color }) => (
						<a
							key={label}
							href={href}
							target="_blank"
							rel="noopener noreferrer"
							className="group panel flex items-center gap-4 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
						>
							<span
								className={cn(
									"grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted text-2xl transition-transform group-hover:scale-105",
									color,
								)}
							>
								{icon}
							</span>
							<div className="min-w-0">
								<p className="font-medium group-hover:text-primary">{label}</p>
								<p className="truncate text-sm text-muted-foreground">
									{handle}
								</p>
							</div>
							<ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
						</a>
					))}
				</div>
			</section>
		</div>
	);
}

export default Contact;
