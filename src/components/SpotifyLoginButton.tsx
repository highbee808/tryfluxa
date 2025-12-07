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
    const SUPABASE_AUTH_URL =
      "https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/spotify-oauth-login";

    try {
      const res = await fetch(SUPABASE_AUTH_URL, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const text = await res.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Supabase returned HTML instead of JSON: " + text);
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch auth URL");
      }

      if (!data.authUrl) {
        throw new Error("Missing authUrl in response");
      }

      window.location.href = data.authUrl;
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Connection Error",
        description: err.message || "Connection failed",
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
