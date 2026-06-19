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
			"panel px-4 py-4 transition-shadow hover:shadow-md",
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
	<div ref={ref} className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />
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

/* ───────────────────────────────────────── CardDescription ────────────────────────────── */
export const CardDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
	<p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

/* ───────────────────────────────────────── CardContent ────────────────────────────────── */
export const CardContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";
