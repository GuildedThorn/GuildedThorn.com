import "@styles/index.css";

import AppRoutes from "@routes/AppRoutes";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import {AuthProvider} from "@components/AuthContext.tsx";

createRoot(document.getElementById("root")!).render(
    <AuthProvider>
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    </AuthProvider>
);
