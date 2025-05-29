import ChatBox from "@components/ChatBox";

function Radio() {
	return (
		<>
			<div className={"py-8 text-center"}>
				<h1 className="text-2xl font-bold mb-4">Welcome to the ThornRadio</h1>
				<p className="mb-6">
					Sign in to chat with me in real time, maybe give some song suggestions
					or ideas that I can do. <br />
					The stream URL is{" "}
					<a
						href="https://radio.guildedthorn.com"
						className="text-blue-500 underline"
					>
						https://radio.guildedthorn.com
					</a>{" "}
					if you want to tune in with external software.
				</p>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<div className="p-4 border rounded-lg shadow">
							Music player will go here
						</div>
					</div>
					<div>
						<div className="p-4 border rounded-lg shadow">
							Chat box will go here
							<ChatBox />
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

export default Radio;
