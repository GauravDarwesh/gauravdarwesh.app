import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AnimatedLedBackground from "@/AnimatedLedBackground";
import { SiteMusicProvider } from "@/components/SiteMusicProvider";
import MusicWelcome from "@/components/MusicWelcome";

import Index from "./pages/Index";
import Hobbies from "./pages/Hobbies";
import Others from "./pages/Others";
import Blog from "./pages/Blog";
import Visuals from "./pages/Visuals";
import SessionTest from "./pages/SessionTest";
import NotFound from "./pages/NotFound";

import { SiteThemeProvider } from "@/components/SiteThemeProvider";

const queryClient = new QueryClient();

const SiteBackground = () => <AnimatedLedBackground />;

const App = () => (
  <SiteMusicProvider>
    <SiteThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          <SiteBackground />

          <BrowserRouter>
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
  </SiteMusicProvider>
);

export default App;
