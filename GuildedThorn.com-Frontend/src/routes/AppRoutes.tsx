import { Routes, Route } from 'react-router-dom';
import MainLayout from '@layouts/MainLayout';

import App from '@pages/App.tsx';
import Stream from '@pages/Stream.tsx';
import Contact from '@pages/Contact.tsx';
import Radio from '@pages/Radio.tsx';
import Login from '@pages/Login.tsx';
import Register from '@pages/Register.tsx';
import GuestBook from "@components/GuestBook.tsx";

import ProtectedRouter from '@routes/ProtectedRouter.tsx';
import UserSettings from "@pages/UserSettings.tsx";
import ThornNet from "@pages/ThornNet.tsx";
import BlogLayout from "@layouts/BlogLayout.tsx";
import BlogList from '@components/Blog/BlogList';
import BlogPost from "@components/Blog/BlogPost.tsx";
import BlogUpload from "@pages/BlogUpload.tsx";
import {Suspense} from "react";
import PomodoroTimer from "@pages/PomodoroTimer.tsx";
import GalleryUpload from "@pages/GalleryUpload.tsx";
import GalleryPost from "@components/Gallery/GalleryPost.tsx";
import GalleryList from "@components/Gallery/GalleryList.tsx";
import GalleryLayout from "@layouts/GalleryLayout.tsx";
import RegexTester from "@pages/RegexTester.tsx";
import LoremIpsumGenerator from "@pages/LoremIpsumGenerator.tsx";
import ColorConverter from "@pages/ColorConverter.tsx";
import UUIDGenerator from "@pages/UUIDGenerator.tsx";


export default function AppRoutes() {
    return (
        <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
            <Routes>
                <Route element={<MainLayout />}>
                    {/* Public routes */}
                    <Route index element={<App />} />
                    <Route path="login" element={<Login />} />
                    <Route path="register" element={<Register />} />
                    <Route path="contact" element={<Contact />} />
                    <Route path="net" element={<ThornNet />} />
                    <Route path="stream" element={<Stream />} />
                    
                    <Route path="tools/pomodoro" element={<PomodoroTimer/>} />
                    <Route path="tools/regex" element={<RegexTester/>} />
                    <Route path="tools/loremipsum" element={<LoremIpsumGenerator />} />
                    <Route path="tools/colorconverter" element={<ColorConverter />} />
                    <Route path="tools/uuidgenerator" element={<UUIDGenerator />} />

                    {/* Protected routes */}
                    <Route element={<ProtectedRouter />}>
                        <Route path="settings" element={<UserSettings />} />
                        <Route path="guestbook" element={<GuestBook />} />
                        <Route path="radio" element={<Radio />} />

                        <Route path="blog/upload" element={<BlogUpload />} />
                        <Route path="blog/pages" element={<BlogLayout />}>
                            <Route index element={<BlogList />} />
                            <Route path=":id" element={<BlogPost />} />
                        </Route>

                        <Route path="gallery/upload" element={<GalleryUpload/>} />
                        <Route path="gallery/images" element={<GalleryLayout/>}>
                            <Route index element={<GalleryList/>} />
                            <Route path=":id" element={<GalleryPost />} />
                        </Route>
                    </Route>

                    {/* Catch-all */}
                    <Route path="*" element={<App />} />
                </Route>
            </Routes>
        </Suspense>
    );
}
