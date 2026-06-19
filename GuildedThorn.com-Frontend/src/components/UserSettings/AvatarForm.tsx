import { useState, type ChangeEvent } from "react";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";
import { Avatar } from "@components/ui/Avatar";
import { useAuth } from "@components/AuthContext";

export default function AvatarForm() {
    const { user, refresh } = useAuth();

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState("");

    const currentSrc = preview ?? user?.avatarUrl ?? null;

    const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0] ?? null;
        setFile(selected);
        setStatus("");
        if (selected) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(selected);
        } else {
            setPreview(null);
        }
    };

    const reset = () => {
        setFile(null);
        setPreview(null);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setStatus("");
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/user/avatar", {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            if (!res.ok) throw new Error((await res.text()) || "Upload failed.");

            await refresh(); // pull the new avatarUrl into AuthContext
            reset();
            setStatus("✅ Avatar updated.");
        } catch (err) {
            setStatus(`❌ ${(err as Error).message}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-3 text-left">
            <h2 className="text-xl font-semibold">Avatar</h2>

            <div className="flex items-center gap-4 sm:gap-5">
                <Avatar src={currentSrc} name={user?.name} className="h-16 w-16 shrink-0 text-xl sm:h-20 sm:w-20 sm:text-2xl" />

                <div className="min-w-0 flex-1 space-y-2">
                    <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFile}
                        className="w-full min-w-0 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium"
                    />
                    <div className="flex items-center gap-2">
                        <Button type="button" size="sm" onClick={handleUpload} disabled={!file || uploading}>
                            {uploading ? "Uploading…" : "Upload"}
                        </Button>
                        {file && (
                            <Button type="button" variant="ghost" size="sm" onClick={reset}>
                                Cancel
                            </Button>
                        )}
                    </div>
                    {status && <p className="text-sm text-muted-foreground">{status}</p>}
                </div>
            </div>
        </div>
    );
}
