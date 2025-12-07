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
      const res = await fetch("/api/get-spotify-auth-url", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      // Handle non-JSON responses gracefully
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        const text = await res.text();
        console.error("[SpotifyLoginButton] Failed to parse response:", text);
        throw new Error("Invalid response from server");
      }

      // Check if we have a valid URL
      if (data?.url) {
        // Perform redirect to Spotify authorization
        window.location.href = data.url;
      } else {
        // No URL in response - show error
        const errorMsg = data?.error || "Invalid auth URL";
        console.error("[SpotifyLoginButton] Invalid auth URL:", errorMsg);
        toast({
          title: "Connection Error",
          description: "Unable to connect to Spotify. Please check your configuration and try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("[SpotifyLoginButton] Spotify connect error:", err);
      toast({
        title: "Connection Error",
        description: "Unable to connect to Spotify. Please check your configuration and try again.",
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
