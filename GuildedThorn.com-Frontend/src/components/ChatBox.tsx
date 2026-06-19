function ChatBox() {
	return (
		<>
			<h1 className="text-center text-3xl font-bold">Chat</h1>
			<div className="panel p-4">
				<p className="text-muted-foreground">Work in progress Chat-box</p>
			</div>
			<input
				name={"Send Message"}
				defaultValue={""}
				className="mt-2 flex h-10 w-full rounded-lg border border-input bg-background px-3
					py-2 text-sm shadow-sm placeholder:text-muted-foreground transition-colors
					focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2
					focus-visible:ring-ring/50"
			/>
		</>
	);
}

export default ChatBox;
