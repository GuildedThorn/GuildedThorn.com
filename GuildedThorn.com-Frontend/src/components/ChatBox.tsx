function ChatBox() {
    return (
        <>
            <h1 className="font-bold text-3xl font-bold text-center">Chat</h1>
            <div className="p-4 border rounded-lg shadow">
                <p>Work in progress Chatbox</p>
            </div>
            <input name={"Send Message"} defaultValue={""} className={"border rounded-md shadow"}/>
        </>
    )
}

export default ChatBox;