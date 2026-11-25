import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router';
import RouteMeta from '@/components/RouteMeta';
import SiteLayout from '@/components/site/SiteLayout';
import { LANG_PREFIX, LANGS } from '@/i18n/lang';
import Home from '@/pages/Home';
import About from '@/pages/About';
import Blog from '@/pages/Blog';
import WritingDetail from '@/pages/WritingDetail';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import NotFound from '@/pages/NotFound';

/*
 * Every page exists in both languages: Hebrew at the root, English under /en.
 * The page components read the language from the address, so one route table
 * serves both.
 */
const PAGES: { path: string; element: React.ReactNode }[] = [
    { path: 'about', element: <About /> },
    { path: 'projects', element: <Projects /> },
    { path: 'projects/:slug', element: <ProjectDetail /> },
    { path: 'blog', element: <Blog /> },
    { path: 'blog/:slug', element: <WritingDetail /> },
];

const App: React.FC = () => (
    <Router>
        <RouteMeta />
        <Routes>
            {LANGS.map((lang) => (
                <Route key={lang} path={LANG_PREFIX[lang] || '/'} element={<SiteLayout />}>
                    <Route index element={<Home />} />
                    {PAGES.map((page) => (
                        <Route key={page.path} path={page.path} element={page.element} />
                    ))}
                    {/* Any other address in this language: the site's 404 page. */}
                    <Route path="*" element={<NotFound />} />
                </Route>
            ))}
        </Routes>
    </Router>
);

export default App;
