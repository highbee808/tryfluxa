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
import AdminHealth from "./pages/AdminHealth";
import AdminSponsors from "./pages/AdminSponsors";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import Analytics from "./pages/Analytics";
import SportsHub from "./pages/SportsHub";
import TeamPage from "./pages/TeamPage";
import Music from "./pages/Music";
import MusicArtistSelection from "./pages/MusicArtistSelection";
import ArtistPage from "./pages/ArtistPage";
import GenrePage from "./pages/GenrePage";
import Fanbase from "./pages/Fanbase";
import FanbaseHub from "./pages/FanbaseHub";
import EntityPage from "./pages/EntityPage";
import PostDetail from "./pages/PostDetail";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import VoiceHistory from "./pages/VoiceHistory";
import VibeRoom from "./pages/VibeRoom";
import VibeRoomsList from "./pages/VibeRoomsList";
import SpotifyCallback from "./pages/SpotifyCallback";
import { PushNotificationPrompt } from "./components/PushNotificationPrompt";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PushNotificationPrompt />
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
          <Route path="/sports-hub" element={<SportsHub />} />
          <Route path="/sports/team/:teamId" element={<TeamPage />} />
          <Route path="/music" element={<Music />} />
          <Route path="/music/vibe-rooms" element={<VibeRoomsList />} />
          <Route path="/music/vibe-room/:roomId" element={<VibeRoom />} />
          <Route path="/spotify/callback" element={<SpotifyCallback />} />
          <Route path="/music-artist-selection" element={<MusicArtistSelection />} />
          <Route path="/music/artist/:artistId" element={<ArtistPage />} />
          <Route path="/music/genre/:genreId" element={<GenrePage />} />
          <Route path="/fanbase" element={<Fanbase />} />
          <Route path="/fanbase-hub" element={<FanbaseHub />} />
          <Route path="/fanbase/:slug" element={<EntityPage />} />
          <Route path="/post/:source/:id" element={<PostDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/voice-history" element={<VoiceHistory />} />
          <Route path="/admin/sponsors" element={<AdminSponsors />} />
          <Route path="/admin/health" element={<AdminHealth />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
