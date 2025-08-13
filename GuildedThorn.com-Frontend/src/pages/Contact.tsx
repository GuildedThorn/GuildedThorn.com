import {
	MailIcon,
	TwitterIcon,
	YoutubeIcon,
	TwitchIcon,
	GithubIcon,
} from "lucide-react";
import {FaDiscord} from "react-icons/fa"; // Using Lucide icons

function Contact() {
	const contacts = [
		{
			label: "Discord",
			value: "GuildedThorn",
			href: "https://discord.com/users/654849939175768074",
			icon: <FaDiscord className="w-6 h-6 mr-3 text-indigo-400" />,
		},
		{
			label: "Twitter",
			value: "@GuildedThorn",
			href: "https://twitter.com/GuildedThorn",
			icon: <TwitterIcon className="w-6 h-6 mr-3 text-sky-400" />,
		},
		{
			label: "Email Me",
			value: "admin@guildedthorn.com: ",
			href: "mailto:admin@guildedthorn.com",
			value2: "PGP:cdddguui A53D 59D2 66F2 969E AF56 0862 BD95 3EEB 309C 4D6A 0E1B 0E17 34AA 5786 5F0C 8B04\n",
			href2: "/files/GuildedThorn.pub",
			icon: <MailIcon className="w-6 h-6 mr-3 text-rose-400" />,
		},
		{
			label: "Youtube Channel",
			value: "GuildedThorn",
			href: "https://www.youtube.com/@GuildedThorn",
			icon: <YoutubeIcon className="w-6 h-6 mr-3 text-yellow-400" />,
		},
		{
			label: "Twitch Channel",
			value: "xGuildedThorn",
			href: "https://www.twitch.tv/xGuildedThorn",
			icon: <TwitchIcon className="w-6 h-6 mr-3 text-purple-400" />, // Using YouTube icon for Twitch as placeholder
		},
		{
			label: "GitHub Repository",
			value: "github.com/GuildedThorn",
			href: "https://github.com/GuildedThorn",
			icon: <GithubIcon className="w-6 h-6 mr-3 text-blue-400" />,
		},
	];
	
		return (
			<div className="px-4 py-10 max-w-4xl mx-auto">
				<h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
					Contact Me
				</h1>
				<p className="text-gray-600 dark:text-gray-300 mb-8">
					Questions, feedback, or partnership inquiries? Reach out via any of the
					platforms below.
				</p>

				<div className="grid sm:grid-cols-2 gap-6">
					{contacts.map(({ label, value, href, icon, value2, href2 }) => (
						<div
							key={label}
							className="flex items-start p-4 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition border dark:border-gray-700"
						>
							{icon}
							<div>
								<a
									href={href}
									target="_blank"
									rel="noopener noreferrer"
									className="text-lg font-medium text-gray-800 dark:text-white group-hover:underline"
								>
									{label}
								</a>
								<p className="text-sm text-gray-500 dark:text-gray-400">{value}</p>

								{/* show only if provided */}
								{value2 && (
									<p className="text-sm text-gray-500 dark:text-gray-400">
										{value2}
									</p>
								)}

								{/* separate link, shown only if provided */}
								{href2 && (
									<a
										href={href2}
										target="_blank"
										rel="noopener noreferrer"
										className="mt-1 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
									>
										Download PGP key
									</a>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	export default Contact;