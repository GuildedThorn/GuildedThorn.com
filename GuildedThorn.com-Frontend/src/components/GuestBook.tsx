import { FormEvent, useEffect, useState } from "react";
import { Trash2, Ban } from "lucide-react";
import { Textarea } from "@components/ui/TextArea";
import { Button } from "@components/ui/Button";
import { Avatar } from "@components/ui/Avatar";
import { useAuth } from "@components/AuthContext";
import { deleteGuestBookMessage, banGuestBookUser } from "@backend/api";

interface GuestBookMessage {
    _id: string;
    username: string;
    message: string;
    createdAt?: string;
    avatarUrl?: string;
}

const formatDate = (iso?: string) =>
    iso
        ? new Date(iso).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
          })
        : "";

export default function GuestBook() {
    const { user } = useAuth();
    const isOwner = user?.role === "owner";

    /* ---------- paging state ---------- */
    const pageSize = 10;
    const [page, setPage] = useState(1);
    const [refresh, setRefresh] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [messages, setMessages] = useState<GuestBookMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [modError, setModError] = useState<string | null>(null);

    /* ---------- form state ---------- */
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    /* ---------- fetch page whenever `page` changes ---------- */
    useEffect(() => {
        const ctrl = new AbortController();
        setLoading(true);

        fetch(`/api/GuestBook/getGuestBookMessages?page=${page}&pageSize=${pageSize}`, {
            credentials: "include",
            signal: ctrl.signal,
        })
            .then((r) => r.json())
            .then((data) => {
                setMessages(data.items);
                setTotalPages(data.totalPages);
            })
            .catch((err) => {
                if (err.name !== "AbortError") console.error(err);
            })
            .finally(() => setLoading(false));

        return () => ctrl.abort();
    }, [page, refresh]);

    /* ---------- owner moderation ---------- */
    async function handleDelete(id: string) {
        if (!window.confirm("Delete this guestbook message?")) return;
        setModError(null);
        try {
            await deleteGuestBookMessage(id);
            setRefresh((r) => r + 1);
        } catch (err) {
            setModError((err as Error).message);
        }
    }

    async function handleBan(username: string) {
        if (
            !window.confirm(
                `Ban ${username}? This removes their message and blocks them from the chat and guestbook.`,
            )
        )
            return;
        setModError(null);
        try {
            await banGuestBookUser(username);
            setRefresh((r) => r + 1);
        } catch (err) {
            setModError((err as Error).message);
        }
    }

    /* ---------- submit handler ---------- */
    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!message.trim()) {
            setSubmitError("Message is required.");
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        try {
            const res = await fetch("/api/GuestBook/message", {
                method: "POST",
                credentials: "include", // sends the JWT cookie
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(message.trim()),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Something went wrong.");
            }

            setMessage("");
            setPage(1); // refresh to show the new entry
        } catch (err) {
            setSubmitError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    }

    /* ---------- render ---------- */
    return (
        <div className="page text-left">
            <header className="mb-6">
                <h1 className="text-3xl">Guestbook</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Leave a note — say hi, drop some feedback, or just sign the book.
                </p>
            </header>

            {/* leave-a-message */}
            <form onSubmit={handleSubmit} className="panel mb-8 p-5">
                <Textarea
                    placeholder="Write something nice…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    disabled={submitting}
                    className="resize-none"
                />
                <div className="mt-3 flex items-center gap-3">
                    {submitError && <p className="text-sm text-destructive">{submitError}</p>}
                    <div className="ml-auto flex items-center gap-3">
                        <span className="text-xs tabular-nums text-muted-foreground">
                            {message.length}
                        </span>
                        <Button type="submit" disabled={submitting || !message.trim()}>
                            {submitting ? "Posting…" : "Post"}
                        </Button>
                    </div>
                </div>
            </form>

            {/* feed */}
            <h2 className="eyebrow mb-3">Messages</h2>

            {modError && (
                <p className="mb-3 text-sm text-destructive">{modError}</p>
            )}

            {loading && messages.length === 0 ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <li key={i} className="panel flex gap-3 p-4">
                            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted-foreground/20" />
                            <div className="flex-1 space-y-2 py-1">
                                <div className="h-3 w-28 animate-pulse rounded bg-muted-foreground/20" />
                                <div className="h-3 w-full animate-pulse rounded bg-muted-foreground/20" />
                            </div>
                        </li>
                    ))}
                </ul>
            ) : messages.length === 0 ? (
                <div className="panel p-10 text-center text-sm text-muted-foreground">
                    No messages yet — be the first to sign the guestbook!
                </div>
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                    {messages.map((msg) => (
                        <li key={msg._id} className="panel flex gap-3 p-4">
                            <Avatar src={msg.avatarUrl} name={msg.username} className="h-10 w-10 text-sm" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="truncate font-semibold">{msg.username}</span>
                                    {msg.createdAt && (
                                        <time
                                            dateTime={msg.createdAt}
                                            className="shrink-0 text-xs text-muted-foreground"
                                        >
                                            {formatDate(msg.createdAt)}
                                        </time>
                                    )}
                                </div>
                                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/90">
                                    {msg.message}
                                </p>

                                {isOwner && (
                                    <div className="mt-2 flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(msg._id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Delete
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-destructive hover:text-destructive"
                                            onClick={() => handleBan(msg.username)}
                                        >
                                            <Ban className="h-3.5 w-3.5" />
                                            Ban
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* pagination */}
            {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1 || loading}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        ← Previous
                    </Button>

                    <span className="text-sm tabular-nums text-muted-foreground">
                        Page {page} of {totalPages}
                    </span>

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === totalPages || loading}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next →
                    </Button>
                </div>
            )}
        </div>
    );
}
