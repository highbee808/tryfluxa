/**
 * Vibe Rooms List Page - Browse and create rooms
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { createVibeRoom, listPublicRooms, joinVibeRoom } from "@/lib/vibeRooms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/BottomNavigation";
import { Music, Plus, Users, Crown, Lock, Unlock } from "lucide-react";
import { SpotifyLoginButton } from "@/components/SpotifyLoginButton";
import { isSpotifyConnected } from "@/lib/spotifyAuth";
import type { VibeRoom } from "@/types/vibeRooms";

export default function VibeRoomsList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<VibeRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadRooms();

    // Subscribe to room updates
    const channel = supabase
      .channel("vibe-rooms-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vibe_rooms",
        },
        () => {
          loadRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const publicRooms = await listPublicRooms();
      setRooms(publicRooms);
    } catch (error) {
      console.error("Failed to load rooms:", error);
      toast({
        title: "Error",
        description: "Failed to load rooms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
      const room = await createVibeRoom({
        name: roomName.trim(),
        privacy,
      });

      toast({
        title: "Room created!",
        description: "Redirecting to your room...",
      });

      setCreateDialogOpen(false);
      setRoomName("");
      navigate(`/music/vibe-room/${room.id}`);
    } catch (error) {
      console.error("Failed to create room:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create room",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      await joinVibeRoom({ room_id: roomId });
      navigate(`/music/vibe-room/${roomId}`);
    } catch (error) {
      console.error("Failed to join room:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join room",
        variant: "destructive",
      });
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
              <SpotifyLoginButton variant="outline" size="sm" />
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!isSpotifyConnected()}>
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
              const memberCount = room.vibe_room_members?.length || 0;
              const isPlaying = room.vibe_room_track_state?.is_playing || false;

              return (
                <Card
                  key={room.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleJoinRoom(room.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">{room.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {room.privacy === "public" ? (
                          <Unlock className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )}
                        <span>{room.privacy}</span>
                      </div>
                    </div>
                    {room.vibe_room_track_state && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary">
                        {room.vibe_room_track_state.track_album_art && (
                          <img
                            src={room.vibe_room_track_state.track_album_art}
                            alt="Album art"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {room.vibe_room_track_state?.track_name && (
                    <div className="mb-4">
                      <p className="text-sm font-medium truncate">
                        {room.vibe_room_track_state.track_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {room.vibe_room_track_state.track_artist}
                      </p>
                    </div>
                  )}

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
