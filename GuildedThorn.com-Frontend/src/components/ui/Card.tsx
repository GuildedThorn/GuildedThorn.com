import * as React from "react";
import { cn } from "@lib/utils";

/* ───────────────────────────────────────── Card ───────────────────────────────────────── */
export const Card = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			"rounded-xl border bg-card text-card-foreground shadow-sm px-4 py-4",
			className,
		)}
		{...props}
	/>
));
Card.displayName = "Card";

/* ───────────────────────────────────────── CardHeader ─────────────────────────────────── */
export const CardHeader = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("p-6 flex flex-col gap-1.5", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

/* ───────────────────────────────────────── CardTitle ──────────────────────────────────── */
export const CardTitle = React.forwardRef<
	HTMLHeadingElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
	<h3
		ref={ref}
		className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
		{...props}
	/>
));
CardTitle.displayName = "CardTitle";

/* ───────────────────────────────────────── CardContent ────────────────────────────────── */
export const CardContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";
