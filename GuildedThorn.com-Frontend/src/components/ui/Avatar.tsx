import { useEffect, useState } from "react";
import { cn } from "@lib/utils";

interface AvatarProps {
    src?: string | null;
    name?: string;
    /** Tailwind sizing/text classes, e.g. "h-10 w-10 text-sm". */
    className?: string;
}

/** Circular avatar that falls back to the name's initial when there's no image
 *  — or when the image fails to load (e.g. a stale/missing avatar URL 404s). */
export function Avatar({ src, name, className }: AvatarProps) {
    const initial = name?.trim().charAt(0) || "?";
    const [failed, setFailed] = useState(false);

    // Reset the error flag if the source changes (e.g. a new avatar is set).
    useEffect(() => setFailed(false), [src]);

    if (src && !failed) {
        return (
            <img
                src={src}
                alt={name ? `${name}'s avatar` : "Avatar"}
                loading="lazy"
                onError={() => setFailed(true)}
                className={cn("shrink-0 rounded-full border border-border object-cover", className)}
            />
        );
    }

    return (
        <span
            className={cn(
                "flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold uppercase text-primary",
                className,
            )}
            aria-hidden="true"
        >
            {initial}
        </span>
    );
}
