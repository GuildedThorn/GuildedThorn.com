import { FormEvent, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/Card";
import { Textarea } from "@components/ui/TextArea";
import { Button } from "@components/ui/Button";

interface GuestBookMessage {
    _id: string;
    username: string;
    message: string;
    createdAt?: string;
}

export default function GuestBook() {
    /* ---------- paging state ---------- */
    const pageSize = 10;
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [messages, setMessages] = useState<GuestBookMessage[]>([]);
    const [loading, setLoading] = useState(false);

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
            .then(r => r.json())
            .then(data => {
                setMessages(data.items);
                setTotalPages(data.totalPages);
            })
            .catch(err => {
                if (err.name !== "AbortError") console.error(err);
            })
            .finally(() => setLoading(false));

        return () => ctrl.abort();
    }, [page]);

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
                credentials: "include",          // sends the JWT cookie
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(message.trim()),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Something went wrong.");
            }

            setMessage("");
            setPage(1);                         // refresh to show the new entry
        } catch (err) {
            setSubmitError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    }


    /* ---------- render ---------- */
    return (
        <div className="space-y-8">
            {/* leave‑a‑message card */}
            <Card>
                <CardHeader>
                    <CardTitle>Leave a message</CardTitle>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Textarea
                            placeholder="Your message"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            rows={4}
                            disabled={submitting}
                        />

                        {submitError && (
                            <p className="text-sm text-red-600">{submitError}</p>
                        )}

                        <Button type="submit" disabled={submitting}>
                            {submitting ? "Sending…" : "Post"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* paged list of messages */}
            <div className="space-y-4">
                {messages.map(msg => (
                    <Card key={msg._id}>
                        <CardHeader>
                            <CardTitle>{msg.username}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>{msg.message}</p>
                        </CardContent>
                    </Card>
                ))}

                <div className="flex items-center justify-between pt-4">
                    <Button
                        variant="outline"
                        disabled={page === 1 || loading}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        Previous
                    </Button>

                    <span className="text-sm">
            Page {page} of {totalPages}
          </span>

                    <Button
                        variant="outline"
                        disabled={page === totalPages || loading}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
