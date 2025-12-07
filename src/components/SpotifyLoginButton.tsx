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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setConnected(isSpotifyConnected());
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/get-spotify-auth-url");

      const text = await res.text();

      // Attempt JSON parse safely
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (err) {
        toast({
          title: "Connection Error",
          description: "Invalid response from server (HTML was returned). Check Supabase function output.",
          variant: "destructive",
        });
        console.error("Non-JSON response:", text);
        setLoading(false);
        return;
      }

      if (!data.authUrl) {
        toast({
          title: "Connection Error",
          description: "Missing auth URL. Backend may be misconfigured.",
          variant: "destructive",
        });
        console.error("Response:", data);
        setLoading(false);
        return;
      }

      // Valid — redirect user
      window.location.href = data.authUrl;
    } catch (err) {
      console.error(err);
      toast({
        title: "Connection Error",
        description: "Unable to connect to Spotify.",
        variant: "destructive",
      });
    }
    setLoading(false);
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
      disabled={loading}
      className={`gap-2 ${className}`}
    >
      <Music className="w-4 h-4" />
      {loading ? "Connecting..." : "Connect Spotify"}
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
