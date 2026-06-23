import StreamPlayer from "@components/StreamPlayer";

const Stream = () => {
	return (
		<div className="page">
			<h1 className="mb-4 text-3xl font-bold tracking-tight">xGuildedThorn</h1>
			<div className="overflow-hidden rounded-2xl border border-border shadow-sm">
				<StreamPlayer />
			</div>
		</div>
	);
};

export default Stream;
