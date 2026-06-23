import { Link } from "react-router-dom";

const LAST_UPDATED = "June 16, 2026";

export default function PrivacyPolicy() {
    return (
        <div className="page text-left">
            <h1 className="text-3xl">Privacy Policy</h1>
            <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

            <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                This policy is provided as a general template describing how this site works. It is not
                legal advice — please review and adapt it for your own circumstances and jurisdiction
                (e.g. GDPR, UK GDPR, CCPA) before relying on it.
            </div>

            <div className="prose prose-gray mt-6 max-w-none break-words dark:prose-invert prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
                <h2>Who we are</h2>
                <p>
                    This website (“GuildedThorn”, “we”, “us”) is a personal site operated by GuildedThorn.
                    If you have any questions about this policy or your data, contact{" "}
                    <a href="mailto:guildedthorn@gmail.com">guildedthorn@gmail.com</a>.
                </p>

                <h2>Information we collect</h2>
                <ul>
                    <li>
                        <strong>Account information.</strong> If you register, we store your username and a
                        securely hashed password. We never store your password in plain text.
                    </li>
                    <li>
                        <strong>Content you submit.</strong> Guestbook messages, blog posts, gallery
                        uploads, and live chat messages you choose to send. This content (and the username
                        attached to it) may be shown publicly on the site.
                    </li>
                    <li>
                        <strong>Authentication.</strong> When you sign in we issue a JSON Web Token (JWT)
                        stored in a secure, <code>HttpOnly</code> cookie so you stay logged in. See our{" "}
                        <Link to="/cookies">Cookie Policy</Link>.
                    </li>
                    <li>
                        <strong>Technical data.</strong> Like most websites, our servers may process basic
                        request data (such as IP address and browser user-agent) for security, debugging,
                        and reliability.
                    </li>
                </ul>

                <h2>How we use your information</h2>
                <ul>
                    <li>To provide core features: accounts, sign-in, the guestbook, blog, gallery, and chat.</li>
                    <li>To keep the site secure and operating correctly.</li>
                    <li>To display content you choose to post publicly.</li>
                </ul>
                <p>
                    We do <strong>not</strong> sell your personal data, and we do not use advertising or
                    cross-site tracking cookies.
                </p>

                <h2>Third-party services</h2>
                <p>
                    Some pages load content from third parties. When they do, those providers may receive
                    your IP address and set their own cookies under their own privacy policies:
                </p>
                <ul>
                    <li>
                        <strong>stats.fm</strong> — to display top artists, and <strong>Spotify</strong>{" "}
                        (image CDN) for artist artwork.
                    </li>
                    <li>
                        <strong>GitHub</strong> — profile, repositories, and contribution activity.
                    </li>
                    <li>
                        <strong>Discord (via Lanyard)</strong> — to show live presence status.
                    </li>
                </ul>

                <h2>Data retention</h2>
                <p>
                    Account and content data are kept until you ask us to delete them or we no longer need
                    them. You can request deletion of your account and associated content at any time.
                </p>

                <h2>Your rights</h2>
                <p>
                    Depending on where you live, you may have rights to access, correct, export, or delete
                    your personal data, and to object to or restrict certain processing. To exercise any of
                    these, email <a href="mailto:guildedthorn@gmail.com">guildedthorn@gmail.com</a>.
                </p>

                <h2>Security</h2>
                <p>
                    We protect data with measures such as password hashing, HTTPS in transit, and
                    authentication cookies marked <code>Secure</code> and <code>HttpOnly</code>. No method
                    of transmission or storage is ever 100% secure.
                </p>

                <h2>Children</h2>
                <p>This site is not directed to children under 13, and we do not knowingly collect their data.</p>

                <h2>Changes to this policy</h2>
                <p>
                    We may update this policy from time to time. The “last updated” date above reflects the
                    most recent revision.
                </p>

                <h2>Contact</h2>
                <p>
                    Questions? Reach us at{" "}
                    <a href="mailto:guildedthorn@gmail.com">guildedthorn@gmail.com</a>.
                </p>
            </div>
        </div>
    );
}
