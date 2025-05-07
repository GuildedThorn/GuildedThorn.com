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
        <div className="flex items-start gap-4 p-4 bg-blue-500 rounded-lg shadow-md w-full max-w-xl mx-auto">
            <div className="text-2xl">{icon}</div>
            <div>
                <div className="font-semibold">{label}</div>
                <div>{value}</div>
            </div>
        </div>
    );
}

function About() {
    return (
        <div className="py-12 px-4 space-y-8">
            <h2 className="text-3xl font-bold text-white">Contact Me</h2>
            <div className="space-y-4">
                <ContactItem icon={<FaDiscord/>} label="Discord" value="GuildedThorn" />
                <ContactItem
                    icon={<MdEmail />}
                    label="Email"
                    value={
                        <>admin@guildedthorn.com using the attached{" "}
                            <a href="/path/to/pgp.asc" className="text-sky-200">
                                PGP Signature
                            </a>
                        </>
                    }
                />
                <ContactItem icon={<FiTwitter />} label="Twitter" value="@guildedthorn" />
                <ContactItem icon={<FaScroll />} label="IRC" value="OFTC, EFNET, or Libera" />
            </div>

            <h2 className="text-3xl font-bold text-white pt-8">Socials</h2>
            <div className="space-y-4">
                <ContactItem icon={<FaYoutube />} label="YouTube" value="@GuildedThorn" />
                <ContactItem icon={<FaGithub />} label="GitHub" value="@GuildedThorn" />
            </div>
        </div>
    );
}

export default About;
