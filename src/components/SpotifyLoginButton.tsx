import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  disconnectSpotify,
  getSpotifyLoginUrlWithPKCE,
  isSpotifyConnected,
  checkSpotifyConnection,
} from "@/lib/spotifyAuth";
import { Music, Check, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SpotifyLoginButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  onDisconnect?: () => void;
}

const SpotifyLoginButton: React.FC<SpotifyLoginButtonProps> = ({
  variant = "default",
  size = "default",
  className = "",
  onDisconnect,
}) => {
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Instant render from localStorage
    setConnected(isSpotifyConnected());

    // Async confirmation from server
    checkSpotifyConnection().then((status) => {
      setConnected(status.connected);
      // Sync localStorage if server says not connected
      if (!status.connected) {
        localStorage.removeItem("spotify_access_token");
        localStorage.removeItem("spotify_refresh_token");
        localStorage.removeItem("spotify_expires_in");
        localStorage.removeItem("spotify_token_timestamp");
      }
    });
  }, []);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const authUrl = await getSpotifyLoginUrlWithPKCE();
      window.location.href = authUrl;
    } catch (err: any) {
      console.error("[SpotifyLoginButton] Spotify connect error:", err);
      toast({
        title: "Connection Error",
        description: err.message || "Connection failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectSpotify();
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
      disabled={loading}
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

  useEffect(() => {
    checkSpotifyConnection().then((status) => {
      setConnected(status.connected);
    });
  }, []);

  const checkConnection = () => {
    setConnected(isSpotifyConnected());
    checkSpotifyConnection().then((status) => {
      setConnected(status.connected);
    });
  };

  return { connected, checkConnection };
}
