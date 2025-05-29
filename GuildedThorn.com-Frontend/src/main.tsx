import "@styles/index.css";

import App from "@routes/App";
import Radio from "@routes/Radio";
import Contact from "@routes/Contact.tsx";

import NavBar from "@components/NavBar.tsx";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ThornNet from "@routes/ThornNet.tsx";
import Stream from "@routes/Stream.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter>
			{/* Place NavBar inside BrowserRouter */}
			<NavBar />
			<Routes>
				<Route path={"/"} element={<App />} />
				<Route path={"/stream"} element={<Stream />} />
				<Route path={"/net"} element={<ThornNet />} />
				<Route path={"/contact"} element={<Contact />} />
				<Route path={"/radio"} element={<Radio />} />
			</Routes>
		</BrowserRouter>
	</StrictMode>,
);
