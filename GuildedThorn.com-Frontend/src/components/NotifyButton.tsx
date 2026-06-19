import { Bell, BellOff } from "lucide-react";
import { Button } from "@components/ui/Button";
import { usePushNotifications } from "@lib/usePushNotifications";

// "Notify me when I go live" opt-in. Works for anyone — no login required.
function NotifyButton() {
    const { supported, subscribed, busy, error, subscribe, unsubscribe } = usePushNotifications();

    if (!supported) return null;

    return (
        <div className="flex flex-col items-center gap-1">
            <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={subscribed ? unsubscribe : subscribe}
                aria-label={subscribed ? "Turn off live notifications" : "Notify me when live"}
            >
                {subscribed ? <BellOff size={16} /> : <Bell size={16} />}
                <span>
                    {busy
                        ? "Working…"
                        : subscribed
                          ? "Notifications on"
                          : "Notify me when live"}
                </span>
            </Button>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export default NotifyButton;
