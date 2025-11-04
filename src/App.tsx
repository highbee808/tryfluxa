import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import TeamSelection from "./pages/TeamSelection";
import Feed from "./pages/Feed";
import FluxaMode from "./pages/FluxaMode";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Memory from "./pages/Memory";
import Live from "./pages/Live";
import LiveRoom from "./pages/LiveRoom";
import Universe from "./pages/Universe";
import Room from "./pages/Room";
import Profile from "./pages/Profile";
import AdminSponsors from "./pages/AdminSponsors";
import AdminHealth from "./pages/AdminHealth";
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
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/team-selection" element={<TeamSelection />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/fluxa-mode" element={<FluxaMode />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/memory" element={<Memory />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/live" element={<Live />} />
          <Route path="/live/:sessionId" element={<LiveRoom />} />
          <Route path="/universe" element={<Universe />} />
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="/admin/sponsors" element={<AdminSponsors />} />
          <Route path="/admin/health" element={<AdminHealth />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
