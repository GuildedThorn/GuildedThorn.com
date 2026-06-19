import * as React from "react";
import { cn } from "@lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, ...props }, ref) => (
        <input
            ref={ref}
            {...props}
            className={cn(
                "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm " +
                "shadow-sm placeholder:text-muted-foreground " +
                "transition-colors focus-visible:outline-none focus-visible:border-ring " +
                "focus-visible:ring-2 focus-visible:ring-ring/50 " +
                "disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
        />
    ),
);
Input.displayName = "Input";
