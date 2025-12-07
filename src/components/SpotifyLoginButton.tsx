import React from "react";
import { Button } from "@/components/ui/button";
import { isSpotifyConnected, disconnectSpotify } from "@/lib/spotifyAuth";
import { Music, Check, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface SpotifyLoginButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

const SpotifyLoginButton: React.FC<SpotifyLoginButtonProps> = ({
  variant = "default",
  size = "default",
  className = "",
  onConnect,
  onDisconnect,
}) => {
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setConnected(isSpotifyConnected());
  }, []);

  const handleConnect = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (!supabaseUrl) {
        throw new Error("Missing VITE_SUPABASE_URL");
      }

      const res = await fetch(
        `${supabaseUrl}/functions/v1/spotify-oauth-login`,
        {
          method: "GET",
          headers: { 
            "Content-Type": "application/json",
            ...(supabaseAnonKey && {
              "Authorization": `Bearer ${supabaseAnonKey}`,
              "apikey": supabaseAnonKey,
            }),
          },
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error("[SpotifyLoginButton] Spotify auth function failed:", res.status, errorText);
        throw new Error("Spotify auth function failed");
      }

      // Parse response safely
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        const text = await res.text();
        console.error("[SpotifyLoginButton] Failed to parse JSON response:", text);
        throw new Error("Invalid JSON response from server");
      }

      // Validate response has authUrl
      if (!data?.authUrl) {
        console.error("[SpotifyLoginButton] Spotify authUrl missing in response:", data);
        throw new Error("Spotify authUrl missing");
      }

      // Redirect to Spotify authorization
      window.location.href = data.authUrl;
    } catch (err) {
      console.error("[SpotifyLoginButton] Spotify connect error:", err);
      toast({
        title: "Connection Error",
        description: err instanceof Error ? err.message : "Unable to connect to Spotify. Please check your configuration and try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = () => {
    disconnectSpotify();
    setConnected(false);
    toast({
      title: "Spotify Disconnected",
      description: "Your Spotify account has been disconnected",
    });
    onDisconnect?.();
  };

  if (connected) {
    return (
      <Button
        variant={variant === "default" ? "outline" : variant}
        size={size}
        onClick={handleDisconnect}
        className={`gap-2 ${className}`}
      >
        <Check className="w-4 h-4" />
        Spotify Connected
        <LogOut className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleConnect}
      className={`gap-2 ${className}`}
    >
      <Music className="w-4 h-4" />
      Connect Spotify
    </Button>
  );
};

export { SpotifyLoginButton };

/**
 * Hook to check Spotify connection status
 */
export function useSpotifyConnection() {
  const [connected, setConnected] = useState(isSpotifyConnected());

  const checkConnection = () => {
    setConnected(isSpotifyConnected());
  };

  return { connected, checkConnection };
}
