import React, { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { register } from "@backend/api";
import type { User } from "@backend/types";

import { Button } from "@components/ui/Button";
import TextInput from "@components/ui/TextInput";
import PasswordInput from "@components/ui/PasswordInput";

const RegisterForm: React.FC = () => {

    const [formData, setFormData] = useState<User>({ username: "", password: "" });
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await register(formData.username, formData.password);
            navigate("/login");
        } catch {
            setError("Registration failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="panel mx-auto my-8 max-w-md p-6 text-left"
        >
            <h1 className="mb-1 text-2xl font-bold">Register</h1>
            <p className="mb-6 text-sm text-muted-foreground">
                Create an account to sign the guestbook and more.
            </p>

            {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

            <TextInput
                id="username"
                label="Username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="YourUsername"
            />

            <PasswordInput
                id="password"
                label="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />

            <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating account…" : "Register"}
            </Button>
        </form>
    );
};

export default RegisterForm;
