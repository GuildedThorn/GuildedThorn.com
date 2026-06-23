import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";
import { useConsent } from "@components/ConsentContext";
import { Button } from "@components/ui/Button";

/**
 * The consent UI: a first-visit banner plus a preferences modal (reopenable
 * from the footer's "Cookie settings"). Persists choices via ConsentContext.
 */
export default function CookieConsent() {
    const {
        decided,
        functional,
        settingsOpen,
        openSettings,
        closeSettings,
        acceptAll,
        rejectNonEssential,
        savePreferences,
    } = useConsent();

    const [functionalChoice, setFunctionalChoice] = useState(functional);

    // Reflect the saved value whenever the modal opens.
    useEffect(() => {
        if (settingsOpen) setFunctionalChoice(functional);
    }, [settingsOpen, functional]);

    const showBanner = !decided && !settingsOpen;

    return (
        <>
            {showBanner && (
                <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 print:hidden">
                    <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur sm:p-5">
                        <div className="flex items-start gap-3">
                            <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                            <div className="min-w-0 text-sm text-muted-foreground">
                                <p className="font-medium text-foreground">We value your privacy</p>
                                <p className="mt-1">
                                    We use strictly necessary cookies to keep you signed in. With your
                                    consent we also load third-party content (such as embedded widgets),
                                    which may set its own cookies. See our{" "}
                                    <Link to="/cookies" className="text-primary hover:underline">
                                        Cookie Policy
                                    </Link>{" "}
                                    and{" "}
                                    <Link to="/privacy" className="text-primary hover:underline">
                                        Privacy Policy
                                    </Link>
                                    .
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={openSettings}>
                                Manage
                            </Button>
                            <Button variant="outline" size="sm" onClick={rejectNonEssential}>
                                Reject non-essential
                            </Button>
                            <Button size="sm" onClick={acceptAll}>
                                Accept all
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {settingsOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 backdrop-blur-sm sm:items-center"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Cookie preferences"
                >
                    <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Cookie preferences</h2>
                            <button
                                onClick={closeSettings}
                                aria-label="Close"
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="tile flex items-start justify-between gap-4 p-4">
                                <div>
                                    <p className="font-medium">Strictly necessary</p>
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                        Required for sign-in and security. Always active.
                                    </p>
                                </div>
                                <span className="eyebrow shrink-0">Always on</span>
                            </div>

                            <label className="tile flex cursor-pointer items-start justify-between gap-4 p-4">
                                <div>
                                    <p className="font-medium">Third-party content</p>
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                        Loads third-party embeds (such as donation widgets), which may
                                        set their own cookies.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={functionalChoice}
                                    onChange={(e) => setFunctionalChoice(e.target.checked)}
                                    className="mt-1 h-5 w-5 shrink-0 accent-primary"
                                />
                            </label>
                        </div>

                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={rejectNonEssential}>
                                Reject all
                            </Button>
                            <Button size="sm" onClick={() => savePreferences({ functional: functionalChoice })}>
                                Save preferences
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
