import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";

import Index from "./pages/Index";

// Secondary pages load on demand so the first screen stays light.
const Hobbies = lazy(() => import("./pages/Hobbies"));
const Others = lazy(() => import("./pages/Others"));
const Blog = lazy(() => import("./pages/Blog"));
const Visuals = lazy(() => import("./pages/Visuals"));
const SessionTest = lazy(() => import("./pages/SessionTest"));
const NotFound = lazy(() => import("./pages/NotFound"));

import { SiteThemeProvider } from "@/components/SiteThemeProvider";

const queryClient = new QueryClient();

const SiteBackground = () => <div aria-hidden="true" className="site-background orange-bg" />;

const App = () => (
  <SiteThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        {/* =========================================================
            PERSISTENT SITE BACKGROUND

            IMPORTANT:
            This is intentionally OUTSIDE BrowserRouter.

            Route changes can therefore replace everything inside
            BrowserRouter without touching the wallpaper element.
        ========================================================= */}
        <SiteBackground />

        {/* =========================================================
            ROUTER / PAGE CONTENT

            Only the page content changes when navigating.
            The background remains mounted independently.
        ========================================================= */}
        <BrowserRouter>
          <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/hobbies" element={<Hobbies />} />
            <Route path="/others" element={<Others />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/visuals" element={<Visuals />} />
            <Route path="/session-test" element={<SessionTest />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </SiteThemeProvider>
);

export default App;
