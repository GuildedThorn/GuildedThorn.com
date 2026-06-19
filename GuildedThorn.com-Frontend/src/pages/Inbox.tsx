import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
	Lock,
	Mail,
	Trash2,
	MailOpen,
	RefreshCw,
	Inbox as InboxIcon,
} from "lucide-react";
import { useAuth } from "@components/AuthContext";
import { Button } from "@components/ui/Button";
import Seo from "@components/Seo";
import {
	getContactMessages,
	markContactMessageRead,
	deleteContactMessage,
	type ContactMessageItem,
} from "@backend/api";

export default function Inbox() {
	const { user, loading: authLoading } = useAuth();
	const isOwner = user?.role === "owner";

	const [items, setItems] = useState<ContactMessageItem[]>([]);
	const [unread, setUnread] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const load = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const data = await getContactMessages(1, 100);
			setItems(data.items ?? []);
			setUnread(data.unread ?? 0);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Couldn’t load messages.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (isOwner) load();
	}, [isOwner, load]);

	const toggleRead = async (m: ContactMessageItem) => {
		const next = !m.isRead;
		setItems((prev) =>
			prev.map((x) => (x.id === m.id ? { ...x, isRead: next } : x)),
		);
		setUnread((u) => Math.max(0, u + (next ? -1 : 1)));
		try {
			await markContactMessageRead(m.id, next);
		} catch {
			load(); // resync on failure
		}
	};

	const remove = async (m: ContactMessageItem) => {
		if (!window.confirm(`Delete the message from ${m.name}? This can't be undone.`))
			return;
		const prev = items;
		setItems((p) => p.filter((x) => x.id !== m.id));
		if (!m.isRead) setUnread((u) => Math.max(0, u - 1));
		try {
			await deleteContactMessage(m.id);
		} catch {
			setItems(prev); // restore on failure
		}
	};

	const spinner = (
		<div className="flex min-h-[40vh] items-center justify-center">
			<div
				className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"
				role="status"
				aria-label="Loading"
			/>
		</div>
	);

	if (authLoading) return <div className="page">{spinner}</div>;

	if (!isOwner) {
		return (
			<div className="page">
				<div className="panel mx-auto mt-8 max-w-md p-8 text-center">
					<Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
					<h1 className="text-xl font-semibold">Owner only</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						You don’t have permission to view the contact inbox.
					</p>
					<Link to="/" className="mt-4 inline-block">
						<Button variant="outline">Back home</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="page text-left">
			<Seo title="Inbox" />

			<header className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className="eyebrow mb-1">Owner</p>
					<h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
						<InboxIcon className="h-7 w-7 text-primary" />
						Inbox
						{unread > 0 && (
							<span className="rounded-full bg-primary px-2 py-0.5 text-sm font-semibold text-primary-foreground">
								{unread}
							</span>
						)}
					</h1>
				</div>
				<Button variant="outline" size="sm" onClick={load} disabled={loading}>
					<RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
					Refresh
				</Button>
			</header>

			{error ? (
				<p className="text-sm text-destructive">{error}</p>
			) : loading ? (
				<div className="space-y-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="panel h-24 animate-pulse" />
					))}
				</div>
			) : items.length === 0 ? (
				<div className="panel p-10 text-center text-muted-foreground">
					No messages yet.
				</div>
			) : (
				<div className="space-y-3">
					{items.map((m) => (
						<article
							key={m.id}
							className={
								"panel p-4 transition-colors sm:p-5 " +
								(m.isRead ? "" : "border-primary/40 bg-primary/5")
							}
						>
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="min-w-0">
									<p className="flex items-center gap-2 font-semibold">
										{!m.isRead && (
											<span
												className="h-2 w-2 shrink-0 rounded-full bg-primary"
												aria-label="Unread"
											/>
										)}
										<span className="truncate">{m.name}</span>
									</p>
									<a
										href={`mailto:${m.email}`}
										className="break-all text-sm text-primary hover:underline"
									>
										{m.email}
									</a>
								</div>
								<time
									dateTime={m.createdAt}
									className="shrink-0 font-mono text-xs text-muted-foreground"
								>
									{new Date(m.createdAt).toLocaleString()}
								</time>
							</div>

							<p className="mt-3 whitespace-pre-wrap break-words text-sm text-foreground/90">
								{m.message}
							</p>

							<div className="mt-4 flex flex-wrap items-center gap-2">
								<a
									href={`mailto:${m.email}?subject=${encodeURIComponent(
										"Re: your message on guildedthorn.com",
									)}`}
								>
									<Button size="sm">
										<Mail className="h-4 w-4" />
										Reply
									</Button>
								</a>
								<Button
									variant="outline"
									size="sm"
									onClick={() => toggleRead(m)}
								>
									{m.isRead ? (
										<>
											<Mail className="h-4 w-4" />
											Mark unread
										</>
									) : (
										<>
											<MailOpen className="h-4 w-4" />
											Mark read
										</>
									)}
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => remove(m)}
									className="text-destructive hover:text-destructive"
								>
									<Trash2 className="h-4 w-4" />
									Delete
								</Button>
							</div>
						</article>
					))}
				</div>
			)}
		</div>
	);
}
