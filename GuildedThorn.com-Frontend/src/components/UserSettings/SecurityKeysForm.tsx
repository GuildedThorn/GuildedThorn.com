import { useEffect, useState } from "react";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import { cn } from "@lib/utils";
import {
	registerSecurityKey,
	listSecurityKeys,
	deleteSecurityKey,
	getTwoFactorStatus,
	setTwoFactor as saveTwoFactor,
	type SecurityKey,
} from "@backend/api";

export default function SecurityKeysForm() {
	const [keys, setKeys] = useState<SecurityKey[]>([]);
	const [loading, setLoading] = useState(true);
	const [nickname, setNickname] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [twoFactor, setTwoFactor] = useState(false);

	const load = async () => {
		setLoading(true);
		try {
			const [list, status] = await Promise.all([
				listSecurityKeys(),
				getTwoFactorStatus(),
			]);
			setKeys(list);
			setTwoFactor(status.enabled);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Couldn’t load keys.");
		} finally {
			setLoading(false);
		}
	};

	const toggleTwoFactor = async () => {
		setError(null);
		const next = !twoFactor;
		setTwoFactor(next); // optimistic
		try {
			await saveTwoFactor(next);
		} catch (e) {
			setTwoFactor(!next); // revert
			setError(e instanceof Error ? e.message : "Couldn’t update 2FA.");
		}
	};

	useEffect(() => {
		load();
	}, []);

	const enroll = async () => {
		setError(null);
		setNotice(null);
		setBusy(true);
		try {
			await registerSecurityKey(nickname.trim() || "Security key");
			setNickname("");
			setNotice("Security key registered.");
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Couldn’t register key.");
		} finally {
			setBusy(false);
		}
	};

	const remove = async (k: SecurityKey) => {
		if (!window.confirm(`Remove “${k.nickname}”?`)) return;
		setError(null);
		try {
			await deleteSecurityKey(k.id);
			setKeys((prev) => {
				const next = prev.filter((x) => x.id !== k.id);
				// Backend turns 2FA off when the last key is removed — mirror it.
				if (next.length === 0) setTwoFactor(false);
				return next;
			});
		} catch (e) {
			setError(e instanceof Error ? e.message : "Couldn’t remove key.");
		}
	};

	return (
		<section>
			<h2 className="flex items-center gap-2 text-xl font-semibold">
				<KeyRound className="h-5 w-5" />
				Security keys
			</h2>
			<p className="mt-1 text-sm text-muted-foreground">
				Register a YubiKey or passkey to sign in with a touch — passwordless, or
				as a second factor.
			</p>

			{error && <p className="mt-3 text-sm text-destructive">{error}</p>}
			{notice && <p className="mt-3 text-sm text-success">{notice}</p>}

			<div className="mt-4 flex flex-col gap-2 sm:flex-row">
				<Input
					value={nickname}
					onChange={(e) => setNickname(e.target.value)}
					placeholder="Key name (e.g. YubiKey 5C)"
				/>
				<Button onClick={enroll} disabled={busy} className="shrink-0">
					<Plus className="h-4 w-4" />
					{busy ? "Waiting for key…" : "Add security key"}
				</Button>
			</div>

			<div className="mt-4 space-y-2">
				{loading ? (
					<p className="text-sm text-muted-foreground">Loading…</p>
				) : keys.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No security keys registered yet.
					</p>
				) : (
					keys.map((k) => (
						<div
							key={k.id}
							className="tile flex items-center justify-between gap-3 p-3"
						>
							<div className="min-w-0">
								<p className="flex items-center gap-2 truncate font-medium">
									<KeyRound className="h-4 w-4 text-primary" />
									{k.nickname}
								</p>
								<p className="text-xs text-muted-foreground">
									Added {new Date(k.createdAt).toLocaleDateString()}
								</p>
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="text-destructive hover:text-destructive"
								onClick={() => remove(k)}
							>
								<Trash2 className="h-4 w-4" />
								Remove
							</Button>
						</div>
					))
				)}
			</div>

			{/* Require a key at login (2FA) */}
			<div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
				<div className="min-w-0">
					<p className="font-medium">Require a security key at login</p>
					<p className="text-sm text-muted-foreground">
						{keys.length === 0
							? "Register a key above to enable this."
							: "After your password, you'll confirm with a key."}
					</p>
				</div>
				<button
					type="button"
					role="switch"
					aria-checked={twoFactor}
					aria-label="Require a security key at login"
					disabled={keys.length === 0 || loading}
					onClick={toggleTwoFactor}
					className={cn(
						"relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
						twoFactor ? "bg-primary" : "bg-muted",
					)}
				>
					<span
						className={cn(
							"absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
							twoFactor ? "translate-x-5" : "translate-x-0.5",
						)}
					/>
				</button>
			</div>
		</section>
	);
}
