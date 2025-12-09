/**
 * Spotify OAuth Callback Handler
 * Receives authorization code from OAuth flow, exchanges it for tokens
 *
 * PATCH: use supabase.functions.invoke("spotify-token") instead of fetch()
 * to avoid CORS and ensure authenticated token exchange.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearSpotifyOAuthParams,
  readSpotifyOAuthParams,
} from "@/lib/spotifyAuth";
import { supabase } from "@/integrations/supabase/client";

export default function SpotifyCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    async function process() {
      const params = new URLSearchParams(window.location.search);

      const code = params.get("code");
      const state = params.get("state");
      const error = params.get("error");

      console.log("🔵 Received Spotify callback with code:", code);

      if (error) {
        navigate("/music/vibe-rooms?error=spotify-auth-failed");
        return;
      }

      if (!code) {
        navigate("/music/vibe-rooms?error=missing-code");
        return;
      }

      // Validate state and PKCE verifier from storage
      const { state: storedState, codeVerifier } = readSpotifyOAuthParams();
      if (!state || !storedState || state !== storedState) {
        setErrorMessage("State mismatch. Please restart the Spotify login flow.");
        clearSpotifyOAuthParams();
        setIsProcessing(false);
        return;
      }

      if (!codeVerifier) {
        setErrorMessage("Missing code verifier. Please restart the Spotify login flow.");
        clearSpotifyOAuthParams();
        setIsProcessing(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("spotify-token", {
          method: "POST",
          body: {
            code,
            code_verifier: localStorage.getItem("spotify_pkce_verifier") ?? codeVerifier,
          },
        });

        console.log("🔵 Spotify token response:", { data, error });

        if (error) {
          throw error;
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

        // Clear one-time PKCE data
        clearSpotifyOAuthParams();

        toast({
          title: "Success",
          description: "Spotify Connected!",
        });
        navigate("/music/vibe-rooms?spotify=connected");
      } catch (err) {
        console.error("[SpotifyCallback] Token exchange failed:", err);
        navigate("/music/vibe-rooms?error=spotify-auth-failed");
      }
    }

    process();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      {isProcessing ? (
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Connecting to Spotify...</p>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      )}
    </div>
  );
}
