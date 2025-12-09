/**
 * Spotify OAuth Callback Handler
 * Receives authorization code from OAuth flow, exchanges it for tokens
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearSpotifyOAuthParams,
  getSpotifyRedirectUri,
  readSpotifyOAuthParams,
} from "@/lib/spotifyAuth";
import { callSupabaseFunction } from "@/lib/supabaseFunctionClient";

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
        const redirectUri = getSpotifyRedirectUri();
        const response = await callSupabaseFunction("spotify-token", {
          code,
          code_verifier: codeVerifier,
          redirect_uri: redirectUri,
        });

        const text = await response.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch (err) {
          console.error("[SpotifyCallback] Non-JSON response:", text);
          setErrorMessage("Invalid response from Spotify backend. Please try again.");
          setIsProcessing(false);
          return;
        }

        if (!response.ok || data.error) {
          navigate("/music/vibe-rooms?error=spotify-auth-failed");
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

        // Clear one-time PKCE data
        clearSpotifyOAuthParams();

        toast({
          title: "Success",
          description: "Spotify Connected!",
        });
        navigate("/music/vibe-rooms");
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
