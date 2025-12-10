/**
 * Vibe Rooms List Page - Browse and create rooms
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { listRooms, createRoom, joinRoom, VibeRoom } from "@/lib/vibeRoomApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/BottomNavigation";
import { Music, Plus, Users, Crown, Lock, Unlock } from "lucide-react";
import { getSpotifyLoginUrlWithPKCE, isSpotifyConnected } from "@/lib/spotifyAuth";

export default function VibeRoomsList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<VibeRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [creating, setCreating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState<boolean>(isSpotifyConnected());
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const searchParams = new URLSearchParams(location.search);
  const spotifyParam = searchParams.get("spotify");
  const errorParam = searchParams.get("error");

  useEffect(() => {
    if (spotifyParam === "connected") {
      setSpotifyConnected(true);
      setSpotifyError(null);
      toast({
        title: "Spotify connected",
        description: "You can now create and join vibe rooms.",
      });
    } else if (errorParam === "spotify-auth-failed") {
      setSpotifyConnected(false);
      setSpotifyError("Spotify connection failed. Please try again.");
      toast({
        title: "Spotify error",
        description: "Spotify connection failed. Please try again.",
        variant: "destructive",
      });
    }
  }, [spotifyParam, errorParam, toast]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      console.log("Loading rooms… via POST action=list");
      const result = await listRooms();

      console.log("Rooms result:", result);

      if (result?.success) {
        setRooms(result.rooms);
      } else {
        throw new Error(result?.error || "Failed to list rooms");
      }
    } catch (err) {
      console.error("Failed to load rooms:", err);
      setError("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast({
        title: "Error",
        description: "Room name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      const room = await createRoom(roomName.trim(), user.id);

      if (room?.success && room.room?.id) {
        setCreateDialogOpen(false);
        setRoomName("");
        setPrivacy("public");
        navigate(`/music/vibe-room/${room.room.id}`);
      } else {
        const message = room?.error || "Failed to create room";
        setError(message);
        console.error("Create room error:", message);
      }
    } catch (err) {
      console.error("Create room error:", err);
      setError("Could not create room");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      const result = await joinRoom(roomId, user?.id);
      if (result?.success) {
        navigate(`/music/vibe-room/${roomId}`);
      } else {
        throw new Error(result?.error || "Failed to join room");
      }
    } catch (error) {
      console.error("Failed to join room:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join room",
        variant: "destructive",
      });
    }
  };

  const handleConnectSpotify = async () => {
    try {
      setIsConnecting(true);
      const authUrl = await getSpotifyLoginUrlWithPKCE();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Spotify connect failed:", error);
      toast({
        title: "Spotify error",
        description: error instanceof Error ? error.message : "Failed to start Spotify auth",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 pb-32 md:pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Music className="w-8 h-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold">Vibe Rooms</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleConnectSpotify}
                disabled={spotifyConnected || isConnecting}
              >
                {spotifyConnected ? "Spotify connected" : isConnecting ? "Connecting..." : "Connect Spotify"}
              </Button>
              {spotifyError && (
                <span className="text-destructive text-sm">{spotifyError}</span>
              )}
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!spotifyConnected}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Room
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Vibe Room</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Room Name</label>
                      <Input
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="Enter room name..."
                        maxLength={50}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Privacy</label>
                      <div className="flex gap-2">
                        <Button
                          variant={privacy === "public" ? "default" : "outline"}
                          onClick={() => setPrivacy("public")}
                          className="flex-1"
                        >
                          <Unlock className="w-4 h-4 mr-2" />
                          Public
                        </Button>
                        <Button
                          variant={privacy === "private" ? "default" : "outline"}
                          onClick={() => setPrivacy("private")}
                          className="flex-1"
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Private
                        </Button>
                      </div>
                    </div>
                    <Button
                      onClick={handleCreateRoom}
                      disabled={creating || !roomName.trim()}
                      className="w-full"
                    >
                      {creating ? "Creating..." : "Create Room"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            Join listening parties and vibe together in real-time
          </p>
        </div>
      </div>

      {/* Rooms List */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-secondary rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-secondary rounded w-1/2"></div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-12 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={loadRooms}>Retry</Button>
          </Card>
        ) : rooms.length === 0 ? (
          <Card className="p-12 text-center">
            <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No rooms yet</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to create a vibe room!
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Room
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => {
              const memberCount = room.members?.length || 0;
              const isPlaying = false; // Track state not in current response

              return (
                <Card
                  key={room.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleJoinRoom(room.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">{room.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Created {new Date(room.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{memberCount} {memberCount === 1 ? "member" : "members"}</span>
                    </div>
                    {isPlaying && (
                      <Badge variant="secondary" className="gap-1">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                        Live
                      </Badge>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
