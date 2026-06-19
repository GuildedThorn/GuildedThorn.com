import React, { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { Button } from "@components/ui/Button";
import TextInput from "@components/ui/TextInput";
import PasswordInput from "@components/ui/PasswordInput";
import { useAuth } from "@components/AuthContext";
import { loginWithSecurityKey } from "@backend/api";


const LoginForm: React.FC = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [keyBusy, setKeyBusy] = useState(false);
    const navigate = useNavigate();
    const { refresh } = useAuth();

    const handleKeyLogin = async () => {
        setError(null);
        setKeyBusy(true);
        try {
            // No username → passwordless with a discoverable key. (The optional
            // username field above scopes it to one account as a 2nd factor.)
            await loginWithSecurityKey(username.trim() || undefined);
            navigate("/");
            await refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Security-key login failed.",
            );
        } finally {
            setKeyBusy(false);
        }
    };


    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const data = await response.json().catch(() => ({}));
                if (data?.twoFactorRequired) {
                    // Password was correct; finish with the security key.
                    try {
                        await loginWithSecurityKey(username.trim() || undefined);
                    } catch (err) {
                        setError(
                            err instanceof Error
                                ? err.message
                                : "Security-key confirmation failed.",
                        );
                        return; // finally resets `submitting`
                    }
                }
                navigate("/");
                await refresh();      // <— this updates the AuthContext
            } else {
                setError("Login failed. Check your username and password.");
            }
        } catch {
            setError("Login failed. Please try again later.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="panel mx-auto my-8 max-w-md p-6 text-left"
        >
            <h1 className="mb-1 text-2xl font-bold">Login</h1>
            <p className="mb-6 text-sm text-muted-foreground">
                Welcome back! Sign in to your account.
            </p>

            {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

            <TextInput
                id="username"
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ThisIsMyUsername"
            />

            <PasswordInput
                id="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Signing in…" : "Login"}
            </Button>

            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
            </div>

            <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={keyBusy}
                onClick={handleKeyLogin}
            >
                <KeyRound className="h-4 w-4" />
                {keyBusy ? "Waiting for key…" : "Sign in with a security key"}
            </Button>
        </form>
    );
};

export default LoginForm;
