import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import Hobbies from "./pages/Hobbies";
import Others from "./pages/Others";
import Blog from "./pages/Blog";
import Visuals from "./pages/Visuals";
import SessionTest from "./pages/SessionTest";
import NotFound from "./pages/NotFound";

import { SiteThemeProvider } from "@/components/SiteThemeProvider";

const queryClient = new QueryClient();

const App = () => (
  <SiteThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          {/* =========================================================
              PERSISTENT SITE BACKGROUND

              This MUST live outside <Routes> so it is mounted only
              once for the entire lifetime of the application.

              Route changes will therefore NOT restart:
              - wallpaper movement
              - color transitions
              - atmospheric waves
              - grain animation
          ========================================================= */}
          <div aria-hidden="true" className="site-background orange-bg" />

          {/* =========================================================
              PAGE CONTENT

              Changing routes only replaces the content below.
              The background above remains mounted continuously.
          ========================================================= */}
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/hobbies" element={<Hobbies />} />
            <Route path="/others" element={<Others />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/visuals" element={<Visuals />} />
            <Route path="/session-test" element={<SessionTest />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </SiteThemeProvider>
);

export default App;
