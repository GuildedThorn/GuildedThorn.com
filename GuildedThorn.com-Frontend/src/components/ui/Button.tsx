import * as React from "react";
import { cn } from "@lib/utils";

const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium " +
    "transition-all duration-150 active:scale-[0.98] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
    "disabled:pointer-events-none disabled:opacity-50";

const styles = {
    default:
        "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground",
    outline:
        "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    destructive:
        "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:text-destructive-foreground",
} as const;

const sizes = {
    sm: "h-8 px-3 text-sm",
    default: "h-10 px-4 py-2 text-sm",
    lg: "h-11 px-6 text-base",
    icon: "h-10 w-10",
} as const;

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: keyof typeof styles;
    size?: keyof typeof sizes;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => (
        <button
            ref={ref}
            {...props}
            className={cn(base, styles[variant], sizes[size], className)}
        />
    ),
);
Button.displayName = "Button";
