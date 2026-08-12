import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Headphones, ShieldCheck } from "lucide-react";
import { useAuth } from "@components/AuthContext";
import { Button } from "@components/ui/Button";

export default function StageConnect() {
    const [params] = useSearchParams();
    const { isAuthenticated, user, loading } = useAuth();
    const [busy, setBusy] = useState(false);
    const [approved, setApproved] = useState(false);
    const [error, setError] = useState("");
    const code = (params.get("code") ?? "").trim().toUpperCase();
    const returnTo = useMemo(
        () => `/stage/connect?code=${encodeURIComponent(code)}`,
        [code],
    );

    const approve = async () => {
        setBusy(true);
        setError("");
        try {
            const response = await fetch("/api/stage-auth/device/approve", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userCode: code }),
            });
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body?.message ?? "This code is invalid or has expired.");
            }
            setApproved(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Approval failed.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="page">
            <section className="panel mx-auto my-12 max-w-xl p-7 text-left">
                <div className="mb-5 flex items-center gap-3">
                    <Headphones className="h-8 w-8 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Connect SurroundStage</h1>
                        <p className="text-sm text-muted-foreground">
                            Verify your identity without sharing your website session.
                        </p>
                    </div>
                </div>

                {!code ? (
                    <p className="text-destructive">No connection code was supplied.</p>
                ) : approved ? (
                    <div className="rounded-lg border border-primary/40 bg-primary/10 p-5">
                        <div className="mb-2 flex items-center gap-2 font-semibold text-primary">
                            <ShieldCheck className="h-5 w-5" /> Approved
                        </div>
                        <p>You can return to SurroundStage. This browser window may be closed.</p>
                    </div>
                ) : loading ? (
                    <p>Checking your account…</p>
                ) : !isAuthenticated ? (
                    <div className="space-y-4">
                        <p>Sign in first, then you will return here to approve code:</p>
                        <p className="rounded bg-muted p-3 text-center font-mono text-xl tracking-widest">{code}</p>
                        <Link
                            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                            to={`/login?returnTo=${encodeURIComponent(returnTo)}`}
                        >
                            Sign in to continue
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p>
                            SurroundStage is requesting a short-lived identity token for{" "}
                            <strong>{String(user?.name ?? "your account")}</strong>.
                        </p>
                        <p className="rounded bg-muted p-3 text-center font-mono text-xl tracking-widest">{code}</p>
                        <p className="text-sm text-muted-foreground">
                            The token works only for room identity and moderation, expires in ten minutes,
                            and cannot access your GuildedThorn account or website APIs.
                        </p>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <Button className="w-full" disabled={busy} onClick={approve}>
                            {busy ? "Approving…" : "Approve SurroundStage"}
                        </Button>
                    </div>
                )}
            </section>
        </div>
    );
}
