import { FaDiscord, FaGithub, FaScroll, FaYoutube } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { FiTwitter } from "react-icons/fi";
import { ReactNode } from "react";

interface ContactItemProps {
	icon: ReactNode;
	label: string;
	value: ReactNode;
}

function ContactItem({ icon, label, value }: ContactItemProps) {
	return (
		<div className="border dark:border-gray-400 rounded-lg bg-gray-100 dark:bg-gray-700 py-4 px-6 mt-4 mb-4">
			<div className="flex items-center space-x-2 text-lg font-semibold text-gray-800 dark:text-white">
				<span className="text-xl">{icon}</span>
				<span>{label}</span>
			</div>
			<div className="mt-2 text-gray-700 dark:text-gray-300">{value}</div>
		</div>
	);
}

function Contact() {
	return (
		<div className="py-12 px-4 space-y-8">
			<h2 className="text-3xl font-bold text-white">Contact Me</h2>
			<div className="space-y-4">
				<ContactItem
					icon={<FaDiscord />}
					label="Discord"
					value="GuildedThorn"
				/>
				<ContactItem
					icon={<MdEmail />}
					label="Email"
					value={
						<>
							admin@guildedthorn.com using the attached{" "}
							<a href="/files/GuildedThorn.pub" className="text-sky-200">
								PGP Signature
							</a>
							<br />
							Sha256 Checksum:
							a53d59d266f2969eaf560862bd953eeb309c4d6a0e1b0e1734aa57865f0c8b04
							GuildedThorn.pub
						</>
					}
				/>
				<ContactItem
					icon={<FiTwitter />}
					label="Twitter"
					value="@guildedthorn"
				/>
				<ContactItem
					icon={<FaScroll />}
					label="IRC"
					value="OFTC, EFNET, or Libera"
				/>
			</div>

			<h2 className="text-3xl font-bold text-white pt-8">Socials</h2>
			<div className="space-y-4">
				<ContactItem
					icon={<FaYoutube />}
					label="YouTube"
					value="@GuildedThorn"
				/>
				<ContactItem icon={<FaGithub />} label="GitHub" value="@GuildedThorn" />
			</div>
		</div>
	);
}

export default Contact;
