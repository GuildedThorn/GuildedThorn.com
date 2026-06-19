import { useState } from "react";
import PasswordInput from "@components/ui/PasswordInput";
import { Button } from "@components/ui/Button";

export default function PasswordChangeForm() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [status, setStatus] = useState("idle"); // idle | success | error
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: { preventDefault: () => void; }) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setStatus("error");
            setMessage("New passwords do not match.");
            return;
        }

        try {
            const response = await fetch("/api/user/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                }),
            });

            if (!response.ok) {
                const { message } = await response.json();
                throw new Error(message || "Failed to change password.");
            }

            setStatus("success");
            setMessage("Password updated successfully.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            setStatus("error");
            if (err instanceof Error) {
                setMessage(err.message);
            } else {
                setMessage("An unexpected error occurred.");
            }
        }

    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2 text-left">
            <h2 className="text-xl font-semibold">Change Password</h2>

            {status !== "idle" && (
                <div
                    className={`text-sm ${
                        status === "success" ? "text-success" : "text-destructive"
                    }`}
                >
                    {message}
                </div>
            )}

            <PasswordInput
                id="currentPassword"
                label="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
            />

            <PasswordInput
                id="newPassword"
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
            />

            <PasswordInput
                id="confirmPassword"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <Button type="submit">Update Password</Button>
        </form>
    );
}
