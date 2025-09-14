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
import Landing from "./pages/Landing";
import SessionTest from "./pages/SessionTest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/hobbies" element={<Hobbies />} />
          <Route path="/others" element={<Others />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/visuals" element={<Visuals />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/session-test" element={<SessionTest />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
