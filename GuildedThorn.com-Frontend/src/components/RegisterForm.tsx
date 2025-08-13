import React, { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { register } from "@backend/api";
import type { User } from "@backend/types";

import {Button} from "@components/ui/Button";
import TextInput from "@components/ui/TextInput";
import PasswordInput from "@components/ui/PasswordInput";

const RegisterForm: React.FC = () => {
    
    const [formData, setFormData] = useState<User>({ username: "", password: "" });
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            await register(formData.username, formData.password);
            navigate("/login"); 
        } catch (err) {
            setError("Registration failed");
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-md dark:bg-gray-900"
        >
            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Register</h1>

            {error && <p className="text-red-500 mb-4">{error}</p>}

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
                type={"password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />

            <Button type="submit">Register</Button>
        </form>
    );
};

export default RegisterForm;