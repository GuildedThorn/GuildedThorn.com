import * as React from "react";
import { cn } from "@lib/utils";

/* basic Tailwind variants (expand as needed) */
const base =
    "inline-flex items-center justify-center rounded-md transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
    "focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const styles = {
    default:  "bg-primary text-primary-foreground hover:bg-primary/90",
    outline:  "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
} as const;

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: keyof typeof styles;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", ...props }, ref) => (
        <button
            ref={ref}
            {...props}
            className={cn(base, styles[variant], "h-10 px-4 py-2", className)}
        />
    ),
);
Button.displayName = "Button";
