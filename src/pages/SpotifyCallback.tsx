/**
 * Spotify OAuth Callback Handler
 * Receives tokens from OAuth flow and stores them in localStorage
 */

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function SpotifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");

  useEffect(() => {
    const error = searchParams.get("error");
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const expiresIn = searchParams.get("expires_in");

    if (error) {
      console.error("Spotify OAuth error:", error);
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

    if (!accessToken) {
      console.error("No access token received");
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
      localStorage.setItem("spotify_access_token", accessToken);
      if (refreshToken) {
        localStorage.setItem("spotify_refresh_token", refreshToken);
      }
      if (expiresIn) {
        localStorage.setItem("spotify_expires_in", expiresIn);
        localStorage.setItem("spotify_token_timestamp", Date.now().toString());
      }

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
