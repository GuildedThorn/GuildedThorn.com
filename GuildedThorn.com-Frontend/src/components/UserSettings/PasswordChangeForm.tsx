import { useState } from "react";

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
                new Error(message || "Failed to change password.");
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
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold">Change Password</h2>

            {status !== "idle" && (
                <div
                    className={`text-sm ${
                        status === "success" ? "text-green-600" : "text-red-600"
                    }`}
                >
                    {message}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium">Current Password</label>
                <input
                    type="password"
                    className="input border-white border-2 p-4 rounded-lg"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium">New Password</label>
                <input
                    type="password"
                    className="input border-white border-2 p-4 rounded-lg"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium">Confirm New Password</label>
                <input
                    type="password"
                    className="input border-white border-2 p-4 rounded-lg"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
            </div>

            <button type="submit" className="btn border-white border-2 p-4 rounded-lg">
                Update Password
            </button>
        </form>
    );
}
