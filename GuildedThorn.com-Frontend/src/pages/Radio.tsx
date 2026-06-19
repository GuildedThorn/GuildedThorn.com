import { Play, Pause, Volume2, VolumeX, RefreshCw, Users } from "lucide-react";
import { Button } from "@components/ui/Button";
import Slider from "@components/ui/Slider.tsx";
import { Card } from "@components/ui/Card.tsx";
import { cn } from "@lib/utils";
import RadioSchedule from "@components/RadioSchedule";
import NotifyButton from "@components/NotifyButton";
import ChatPanel from "@components/ChatPanel";
import { useRadioPlayer } from "@components/RadioPlayerContext";

// Playback now lives in <RadioPlayerProvider> (above the router) so audio keeps
// going when you navigate away — this page is just the full UI for it.
function Radio() {
    const {
        online,
        playing,
        loading,
        title,
        artist,
        listeners,
        volume,
        muted,
        toggle,
        toggleMute,
        setVolume,
    } = useRadioPlayer();

    return (
        <div className="page space-y-8">
        <div className="section">
            <Card>
                <div className="p-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-2">
                            <span
                                className={cn(
                                    "h-2 w-2 rounded-full",
                                    online === true
                                        ? "animate-pulse bg-success"
                                        : online === false
                                          ? "bg-destructive"
                                          : "bg-muted-foreground",
                                )}
                            />
                            <span className="eyebrow">
                                {online === null ? "Checking…" : online ? "On air" : "Offline"}
                            </span>
                            {online && (
                                <span
                                    className="eyebrow flex items-center gap-1 text-muted-foreground"
                                    title="People listening right now"
                                >
                                    <Users size={14} />
                                    {listeners}
                                </span>
                            )}
                        </div>

                        <div className="text-center space-y-1">
                            <h2 className="truncate text-lg font-semibold">
                                {online === false ? "Stream offline" : title || "GuildedThorn Radio"}
                            </h2>
                            <p className="truncate text-sm text-muted-foreground">
                                {online === false ? "No source connected" : artist || "Live"}
                            </p>
                        </div>

                        {playing && loading && (
                            <div className="flex justify-center text-muted-foreground">
                                <RefreshCw className="animate-spin" size={24} />
                            </div>
                        )}

                        <div className="flex items-center justify-center">
                            <Button
                                variant="outline"
                                onClick={toggle}
                                disabled={online === false}
                                className="h-16 w-16 rounded-full"
                                aria-label={playing ? "Pause" : "Play"}
                            >
                                {playing ? <Pause size={32} /> : <Play size={32} />}
                            </Button>
                        </div>

                        {/* Volume gets its own full-width row so it's draggable on touch. */}
                        <div className="mx-auto flex w-full max-w-xs items-center gap-3">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={toggleMute}
                                aria-label={muted ? "Unmute" : "Mute"}
                                className="shrink-0"
                            >
                                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </Button>
                            <div className="min-w-0 flex-1">
                                <Slider
                                    value={[volume]}
                                    max={1}
                                    step={0.01}
                                    onValueChange={(val) => setVolume(val[0])}
                                />
                            </div>
                        </div>

                        <div className="flex justify-center pt-2">
                            <NotifyButton />
                        </div>
                    </div>
                </div>
            </Card>

            <ChatPanel />
        </div>

            <RadioSchedule />
        </div>
    );
}

export default Radio;
