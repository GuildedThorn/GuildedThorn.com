import type { ReactNode } from "react";
import {
	FaLinkedin,
	FaDiscord,
	FaXTwitter,
	FaYoutube,
	FaGithub,
} from "react-icons/fa6";

export type Social = {
	label: string;
	handle: string;
	href: string;
	icon: ReactNode;
	color: string;
};

export const socials: Social[] = [
	{
		label: "LinkedIn",
		handle: "Jamie Duddleston",
		href: "https://www.linkedin.com/in/jamie-duddleston-702768336/",
		icon: <FaLinkedin />,
		color: "text-sky-500",
	},
	{
		label: "Discord",
		handle: "GuildedThorn",
		href: "https://discord.com/users/654849939175768074",
		icon: <FaDiscord />,
		color: "text-indigo-400",
	},
	{
		label: "X / Twitter",
		handle: "@GuildedThorn",
		href: "https://twitter.com/GuildedThorn",
		icon: <FaXTwitter />,
		color: "text-foreground",
	},
	{
		label: "YouTube",
		handle: "GuildedThorn",
		href: "https://www.youtube.com/@GuildedThorn",
		icon: <FaYoutube />,
		color: "text-red-500",
	},
	{
		label: "GitHub",
		handle: "github.com/GuildedThorn",
		href: "https://github.com/GuildedThorn",
		icon: <FaGithub />,
		color: "text-blue-400",
	},
];
