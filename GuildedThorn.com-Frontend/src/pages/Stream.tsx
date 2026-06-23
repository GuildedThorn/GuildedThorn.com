import { Users } from "lucide-react";
import StreamPlayer from "@components/StreamPlayer";
import ChatPanel from "@components/ChatPanel";
import { useStreamStatus } from "@lib/useStreamStatus";
import { useWatchtime } from "@lib/useWatchtime";
import { cn } from "@lib/utils";

const Stream = () => {
	const { online, viewers, title } = useStreamStatus();

	// Credit stream watchtime to the logged-in viewer while the broadcast is live
	// and they're on this page (the player autoplays when online).
	useWatchtime("stream", online === true);

	return (
		<div className="page">
			{/* Header: channel + on-air state, mirroring the radio page. */}
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div className="min-w-0">
					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">xGuildedThorn</h1>
					<p className="truncate text-sm text-muted-foreground">
						{online ? title || "Live now" : "Live stream"}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
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
							title="People watching right now"
						>
							<Users size={14} />
							{viewers}
						</span>
					)}
				</div>
			</div>

			{/* Video + chat: side by side on desktop, stacked on mobile. */}
			<div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
				<div className="overflow-hidden rounded-2xl border border-border shadow-sm">
					<StreamPlayer online={online} />
				</div>
				<ChatPanel />
			</div>
		</div>
	);
};

export default Stream;
