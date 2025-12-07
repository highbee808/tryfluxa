/**
 * Spotify OAuth Callback Handler
 * Receives authorization code from OAuth flow, exchanges it for tokens
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function SpotifyCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    async function process() {
      const params = new URLSearchParams(window.location.search);

      const code = params.get("code");
      const state = params.get("state");
      const error = params.get("error");

      if (error) {
        toast({
          title: "Connection Error",
          description: "Spotify authorization failed.",
          variant: "destructive",
        });
        navigate("/music/vibe-rooms");
        return;
      }

      if (!code) {
        toast({
          title: "Connection Error",
          description: "Missing authorization code.",
          variant: "destructive",
        });
        navigate("/music/vibe-rooms");
        return;
      }

      // Exchange code with Supabase function
      const res = await fetch("https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/spotify-oauth-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (err) {
        toast({
          title: "Connection Error",
          description: "Invalid response from Spotify backend.",
          variant: "destructive",
        });
        console.error(text);
        navigate("/music/vibe-rooms");
        return;
      }

      if (data.error) {
        toast({
          title: "Connection Error",
          description: "Spotify connection failed.",
          variant: "destructive",
        });
        navigate("/music/vibe-rooms");
        return;
      }

      // SUCCESS - Store tokens
      if (data.access_token) {
        localStorage.setItem("spotify_access_token", data.access_token);
        if (data.refresh_token) {
          localStorage.setItem("spotify_refresh_token", data.refresh_token);
        }
        if (data.expires_in) {
          localStorage.setItem("spotify_expires_in", data.expires_in.toString());
          localStorage.setItem("spotify_token_timestamp", Date.now().toString());
        }
      }

      toast({
        title: "Success",
        description: "Spotify Connected!",
      });
      navigate("/music/vibe-rooms");
    }

    process();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Connecting to Spotify...</p>
      </div>
    </div>
  );
}
