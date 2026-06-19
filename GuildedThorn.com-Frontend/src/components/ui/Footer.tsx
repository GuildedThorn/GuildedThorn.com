import { Link } from "react-router-dom";
import { useConsent } from "@components/ConsentContext";

const explore = [
    { to: "/stream", label: "Stream" },
    { to: "/gallery/images/", label: "Gallery" },
    { to: "/blog/pages", label: "Blog" },
    { to: "/radio", label: "Radio" },
    { to: "/tools", label: "Tools" },
];

const more = [
    { to: "/net", label: "Network" },
    { to: "/guestbook", label: "Guestbook" },
    { to: "/contact", label: "Contact" },
    { to: "/resume", label: "Résumé" },
    { to: "/settings", label: "Settings" },
];

const linkCls = "text-sm text-muted-foreground transition-colors hover:text-primary";

export default function Footer() {
    const { openSettings } = useConsent();

    return (
        <div className="mt-12 px-3 pb-3 print:hidden">
            <footer className="mx-auto max-w-7xl rounded-2xl border border-border bg-card/80 px-4 py-10 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70 sm:px-6">
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-3">
                        <Link to="/" className="flex items-center gap-2">
                            <img src="/images/Logo.svg" alt="GuildedThorn logo" className="h-8 w-8" />
                            <span className="text-lg font-extrabold tracking-tight text-primary">
                                GuildedThorn
                            </span>
                        </Link>
                        <p className="max-w-xs text-sm text-muted-foreground">
                            My corner of the internet — projects, music, streams, and the occasional
                            experiment.
                        </p>
                    </div>

                    <nav aria-label="Explore">
                        <h3 className="eyebrow mb-3">Explore</h3>
                        <ul className="space-y-2">
                            {explore.map((l) => (
                                <li key={l.to}>
                                    <Link to={l.to} className={linkCls}>
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <nav aria-label="More">
                        <h3 className="eyebrow mb-3">More</h3>
                        <ul className="space-y-2">
                            {more.map((l) => (
                                <li key={l.to}>
                                    <Link to={l.to} className={linkCls}>
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <nav aria-label="Legal">
                        <h3 className="eyebrow mb-3">Legal</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/privacy" className={linkCls}>
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link to="/cookies" className={linkCls}>
                                    Cookie Policy
                                </Link>
                            </li>
                            <li>
                                <button type="button" onClick={openSettings} className={linkCls}>
                                    Cookie settings
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>

                <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-center text-sm text-muted-foreground sm:flex-row sm:text-left">
                    <p className="text-balance">
                        &copy; {new Date().getFullYear()} GuildedThorn. All rights reserved.
                    </p>
                    <p>Made with React &amp; love.</p>
                </div>
            </footer>
        </div>
    );
}
