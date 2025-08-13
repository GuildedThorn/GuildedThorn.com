import React, { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import {Button} from "@components/ui/Button";
import TextInput from "@components/ui/TextInput";
import PasswordInput from "@components/ui/PasswordInput";
import { useAuth } from "@components/AuthContext";


const LoginForm: React.FC = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const { refresh } = useAuth();


    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            navigate("/");
            await refresh();      // <— this updates the AuthContext
        } else {
            alert("Login failed");
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-md dark:bg-gray-900"
        >
            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Login</h1>

            <TextInput
                id="username"
                label="Username"
                value={username}
                onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setUsername(e.target.value)}
                placeholder="ThisIsMyUsername"
            />

            <PasswordInput
                id="password"
                label="Password"
                type={"password"}
                value={password}
                onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setPassword(e.target.value)}
            />

            <Button type="submit">Login</Button>
        </form>
    );
};

export default LoginForm;
