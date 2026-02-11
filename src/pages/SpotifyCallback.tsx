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
  readSpotifyOAuthParams,
  getSpotifyRedirectUri,
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

      if (error) {
        setErrorMessage("Spotify authorization was denied or failed.");
        setIsProcessing(false);
        return;
      }

      if (!code) {
        setErrorMessage("Missing authorization code from Spotify.");
        setIsProcessing(false);
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
        const { data, error: invokeError } = await supabase.functions.invoke("spotify-token", {
          method: "POST",
          body: {
            code,
            code_verifier: codeVerifier,
            redirect_uri: getSpotifyRedirectUri(),
          },
        });

        if (invokeError) {
          throw invokeError;
        }

        // SUCCESS - Store tokens in localStorage for quick access
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
      } catch (err: any) {
        console.error("[SpotifyCallback] Token exchange failed:", err);
        const message =
          err?.message ||
          err?.context?.error ||
          "Token exchange failed. Please try again.";
        setErrorMessage(message);
        setIsProcessing(false);
      }
    }

    process();
  }, [navigate, toast]);

  const handleRetry = () => {
    clearSpotifyOAuthParams();
    navigate("/music/vibe-rooms");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      {isProcessing ? (
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Connecting to Spotify...</p>
        </div>
      ) : errorMessage ? (
        <div className="text-center space-y-4 max-w-md px-4">
          <p className="text-destructive font-medium">{errorMessage}</p>
          <Button onClick={handleRetry} variant="outline">
            Back to Vibe Rooms
          </Button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      )}
    </div>
  );
}
