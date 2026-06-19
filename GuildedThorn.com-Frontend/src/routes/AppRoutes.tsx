import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';

// Shell + guard load eagerly (tiny, needed on every route).
import MainLayout from '@layouts/MainLayout';
import ProtectedRouter from '@routes/ProtectedRouter.tsx';

// Everything else is code-split so a route only ships its own JS
// (e.g. ReactFlow on /net, SignalR on /radio, markdown+highlight on /blog).
const App = lazy(() => import('@pages/App.tsx'));
const Stream = lazy(() => import('@pages/Stream.tsx'));
const Contact = lazy(() => import('@pages/Contact.tsx'));
const Radio = lazy(() => import('@pages/Radio.tsx'));
const Login = lazy(() => import('@pages/Login.tsx'));
const Register = lazy(() => import('@pages/Register.tsx'));
const GuestBook = lazy(() => import('@components/GuestBook.tsx'));
const UserSettings = lazy(() => import('@pages/UserSettings.tsx'));
const ThornNet = lazy(() => import('@pages/ThornNet.tsx'));
const BlogLayout = lazy(() => import('@layouts/BlogLayout.tsx'));
const BlogList = lazy(() => import('@components/Blog/BlogList'));
const BlogPost = lazy(() => import('@components/Blog/BlogPost.tsx'));
const BlogUpload = lazy(() => import('@pages/BlogUpload.tsx'));
const GalleryUpload = lazy(() => import('@pages/GalleryUpload.tsx'));
const GalleryPost = lazy(() => import('@components/Gallery/GalleryPost.tsx'));
const GalleryList = lazy(() => import('@components/Gallery/GalleryList.tsx'));
const GalleryLayout = lazy(() => import('@layouts/GalleryLayout.tsx'));
const Tools = lazy(() => import('@pages/Tools.tsx'));
const PrivacyPolicy = lazy(() => import('@pages/PrivacyPolicy.tsx'));
const CookiePolicy = lazy(() => import('@pages/CookiePolicy.tsx'));
const Resume = lazy(() => import('@pages/Resume.tsx'));
const Projects = lazy(() => import('@pages/Projects.tsx'));
const Inbox = lazy(() => import('@pages/Inbox.tsx'));
const NotFound = lazy(() => import('@pages/NotFound.tsx'));
const Uses = lazy(() => import('@pages/Uses.tsx')); // /uses page — delete this line + its <Route> to remove


// Old per-tool URLs (e.g. /tools/regex) land on the matching section of /tools
function ToolRedirect() {
    const { tool } = useParams<{ tool: string }>();
    return <Navigate to={{ pathname: "/tools", hash: tool }} replace />;
}

export default function AppRoutes() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[60vh] items-center justify-center">
                    <div
                        className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"
                        role="status"
                        aria-label="Loading"
                    />
                </div>
            }
        >
            <Routes>
                <Route element={<MainLayout />}>
                    {/* Public routes */}
                    <Route index element={<App />} />
                    <Route path="login" element={<Login />} />
                    <Route path="register" element={<Register />} />
                    <Route path="contact" element={<Contact />} />
                    <Route path="net" element={<ThornNet />} />
                    <Route path="stream" element={<Stream />} />

                    <Route path="tools" element={<Tools />} />
                    {/* Old per-tool URLs redirect to their section on the combined page */}
                    <Route path="tools/:tool" element={<ToolRedirect />} />

                    <Route path="privacy" element={<PrivacyPolicy />} />
                    <Route path="cookies" element={<CookiePolicy />} />
                    <Route path="resume" element={<Resume />} />
                    <Route path="projects" element={<Projects />} />
                    <Route path="uses" element={<Uses />} />

                    {/* Blog & gallery are public to read; upload/edit stay owner-only below */}
                    <Route path="blog/pages" element={<BlogLayout />}>
                        <Route index element={<BlogList />} />
                        <Route path=":id" element={<BlogPost />} />
                    </Route>
                    <Route path="gallery/images" element={<GalleryLayout />}>
                        <Route index element={<GalleryList />} />
                        <Route path=":id" element={<GalleryPost />} />
                    </Route>

                    {/* Protected routes */}
                    <Route element={<ProtectedRouter />}>
                        <Route path="settings" element={<UserSettings />} />
                        <Route path="inbox" element={<Inbox />} />
                        <Route path="guestbook" element={<GuestBook />} />
                        <Route path="radio" element={<Radio />} />

                        <Route path="blog/upload" element={<BlogUpload />} />
                        <Route path="gallery/upload" element={<GalleryUpload/>} />
                    </Route>

                    {/* Catch-all */}
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </Suspense>
    );
}
