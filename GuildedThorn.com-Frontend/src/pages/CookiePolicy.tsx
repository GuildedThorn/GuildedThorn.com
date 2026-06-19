import { Link } from "react-router-dom";
import { Button } from "@components/ui/Button";
import { useConsent } from "@components/ConsentContext";

const LAST_UPDATED = "June 16, 2026";

const cookies = [
    {
        name: "token",
        type: "Strictly necessary",
        purpose: "Keeps you signed in (JWT). Secure, HttpOnly, SameSite=Strict.",
        duration: "Session",
    },
    {
        name: "gt-cookie-consent-v1",
        type: "Strictly necessary",
        purpose: "Remembers your cookie choices. Stored in your browser (localStorage).",
        duration: "Until cleared",
    },
    {
        name: "Twitch cookies",
        type: "Third-party content",
        purpose: "Set by the Twitch embed when you enable third-party content.",
        duration: "Set by Twitch",
    },
];

export default function CookiePolicy() {
    const { openSettings } = useConsent();

    return (
        <div className="page text-left">
            <h1 className="text-3xl">Cookie Policy</h1>
            <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

            <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                This policy is a general template describing the cookies and similar technologies this site
                uses. It is not legal advice — review and adapt it for your jurisdiction before relying on it.
            </div>

            <div className="prose prose-gray mt-6 max-w-none break-words dark:prose-invert prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
                <h2>What are cookies?</h2>
                <p>
                    Cookies are small files stored on your device. We also use similar browser storage such
                    as <code>localStorage</code>. They let the site remember things like your sign-in
                    session and your cookie preferences.
                </p>

                <h2>How we use them</h2>
                <ul>
                    <li>
                        <strong>Strictly necessary</strong> — required for the site to function (sign-in,
                        security, remembering your consent choices). These are always active and can’t be
                        switched off.
                    </li>
                    <li>
                        <strong>Third-party content</strong> — optional. When enabled, embeds such as the
                        Twitch stream may set their own cookies. These load only with your consent.
                    </li>
                </ul>
                <p>We do not use analytics, advertising, or cross-site tracking cookies.</p>

                <h2>Cookies we use</h2>
            </div>

            <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="py-2 pr-4 font-semibold">Name</th>
                            <th className="py-2 pr-4 font-semibold">Type</th>
                            <th className="py-2 pr-4 font-semibold">Purpose</th>
                            <th className="py-2 font-semibold">Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cookies.map((c) => (
                            <tr key={c.name} className="border-b border-border align-top">
                                <td className="py-3 pr-4 font-mono text-xs">{c.name}</td>
                                <td className="py-3 pr-4 text-muted-foreground">{c.type}</td>
                                <td className="py-3 pr-4 text-muted-foreground">{c.purpose}</td>
                                <td className="py-3 text-muted-foreground">{c.duration}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="prose prose-gray mt-6 max-w-none break-words dark:prose-invert prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
                <h2>Managing your preferences</h2>
                <p>
                    You can change your choices at any time using the button below, or via “Cookie settings”
                    in the footer. You can also clear or block cookies in your browser settings, though
                    disabling strictly necessary cookies may break sign-in.
                </p>
            </div>

            <div className="mt-4">
                <Button onClick={openSettings}>Manage cookie preferences</Button>
            </div>

            <div className="prose prose-gray mt-6 max-w-none break-words dark:prose-invert prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
                <p>
                    For more on how we handle your data, see our{" "}
                    <Link to="/privacy">Privacy Policy</Link>.
                </p>
            </div>
        </div>
    );
}
