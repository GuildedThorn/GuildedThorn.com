import '@styles/index.css'

import App from '@routes/App'
import Radio from '@routes/Radio'
import About from "@routes/About.tsx";

import NavBar from "@components/NavBar.tsx";

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from "react-router-dom";

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            {/* Place NavBar inside BrowserRouter */}
            <NavBar />
            <Routes>
                <Route path={"/"} element={<App/>}/>
                <Route path={"/about"} element={<About/>}/>
                <Route path={"/radio"} element={<Radio/>}/>
            </Routes>
        </BrowserRouter>
    </StrictMode>
)