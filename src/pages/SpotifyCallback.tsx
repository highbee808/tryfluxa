/**
 * Spotify OAuth Callback Handler
 * Receives authorization code from OAuth flow, exchanges it for tokens using PKCE
 */

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { getCodeVerifier, clearCodeVerifier } from "@/lib/pkce";
import { getSpotifyRedirectUri } from "@/lib/spotifyAuth";
import { getApiBaseUrl } from "@/lib/apiConfig";

export default function SpotifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");

  useEffect(() => {
    const handleCallback = async () => {
      const error = searchParams.get("error");
      const code = searchParams.get("code");

      // Handle OAuth errors
      if (error) {
        console.error("Spotify OAuth error:", error);
        clearCodeVerifier(); // Clean up PKCE data
        setStatus("error");
        toast({
          title: "Spotify Connection Failed",
          description: error === "access_denied" 
            ? "You cancelled the Spotify authorization"
            : "Failed to connect Spotify. Please try again.",
          variant: "destructive",
        });

        setTimeout(() => {
          navigate("/music");
        }, 2000);
        return;
      }

      // Handle missing authorization code
      if (!code) {
        console.error("No authorization code received");
        clearCodeVerifier();
        setStatus("error");
        toast({
          title: "Connection Failed",
          description: "No authorization code received from Spotify",
          variant: "destructive",
        });

        setTimeout(() => {
          navigate("/music");
        }, 2000);
        return;
      }

      // Retrieve code verifier from sessionStorage
      const codeVerifier = getCodeVerifier();
      if (!codeVerifier) {
        console.error("No code verifier found - PKCE flow may have been interrupted");
        setStatus("error");
        toast({
          title: "Connection Failed",
          description: "Session expired. Please try connecting again.",
          variant: "destructive",
        });

        setTimeout(() => {
          navigate("/music");
        }, 2000);
        return;
      }

      // Exchange code for tokens via Edge Function
      try {
        const apiBase = getApiBaseUrl();
        const redirectUri = getSpotifyRedirectUri();
        
        const response = await fetch(`${apiBase}/spotify-oauth-login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
          }),
        });

        // Handle 401 - likely missing environment variables
        if (response.status === 401) {
          console.error("401 Unauthorized - Missing environment variables");
          console.error("Required Supabase Secrets: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET");
          clearCodeVerifier();
          setStatus("error");
          toast({
            title: "Configuration Error",
            description: "Server configuration error. Please contact support.",
            variant: "destructive",
          });

          setTimeout(() => {
            navigate("/music");
          }, 2000);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Token exchange failed:", response.status, errorData);
          clearCodeVerifier();
          setStatus("error");
          toast({
            title: "Connection Failed",
            description: errorData.error || "Failed to exchange authorization code for tokens",
            variant: "destructive",
          });

          setTimeout(() => {
            navigate("/music");
          }, 2000);
          return;
        }

        const tokenData = await response.json();

        // Handle missing token response
        if (!tokenData.access_token) {
          console.error("No access token in response:", tokenData);
          clearCodeVerifier();
          setStatus("error");
          toast({
            title: "Connection Failed",
            description: "No access token received from Spotify",
            variant: "destructive",
          });

          setTimeout(() => {
            navigate("/music");
          }, 2000);
          return;
        }

        // Store tokens in localStorage
        try {
          localStorage.setItem("spotify_access_token", tokenData.access_token);
          if (tokenData.refresh_token) {
            localStorage.setItem("spotify_refresh_token", tokenData.refresh_token);
          }
          if (tokenData.expires_in) {
            localStorage.setItem("spotify_expires_in", tokenData.expires_in.toString());
            localStorage.setItem("spotify_token_timestamp", Date.now().toString());
          }

          // Clean up PKCE data
          clearCodeVerifier();

          setStatus("success");
          toast({
            title: "Spotify Connected!",
            description: "You can now use Vibe Rooms",
          });

          // Redirect to music page after a brief delay
          setTimeout(() => {
            navigate("/music/vibe-rooms");
          }, 1500);
        } catch (err) {
          console.error("Failed to store tokens:", err);
          clearCodeVerifier();
          setStatus("error");
          toast({
            title: "Storage Failed",
            description: "Failed to store Spotify tokens",
            variant: "destructive",
          });

          setTimeout(() => {
            navigate("/music");
          }, 2000);
        }
      } catch (err) {
        console.error("Token exchange error:", err);
        clearCodeVerifier();
        setStatus("error");
        toast({
          title: "Connection Error",
          description: err instanceof Error ? err.message : "Failed to connect to Spotify",
          variant: "destructive",
        });

        setTimeout(() => {
          navigate("/music");
        }, 2000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        {status === "processing" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Connecting to Spotify...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-12 h-12 mx-auto bg-green-500 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <p className="text-muted-foreground">Spotify connected successfully!</p>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <p className="text-muted-foreground">Connection failed</p>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </>
        )}
      </div>
    </div>
  );
}
