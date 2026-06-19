import { twMerge } from "tailwind-merge";

/**
 * Join class names and resolve conflicting Tailwind utilities so the last
 * one wins (e.g. a caller's `p-6` reliably overrides a base `p-4`).
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
    return twMerge(classes.filter(Boolean).join(" "));
}
