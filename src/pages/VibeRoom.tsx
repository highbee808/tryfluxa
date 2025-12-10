/**
 * Vibe Room Page - Listening Party Feature
 * Phase 1 MVP: Real-time synchronized music listening with chat
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useVibeRoom } from "@/hooks/useVibeRoom";
import { getRoom, joinRoom } from "@/lib/vibeRoomApi";
import { SpotifyVibeRoomPlayer } from "@/lib/spotifyVibeRoom";
import { VibeRoomVisualizer } from "@/components/VibeRoomVisualizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/BottomNavigation";
import { ArrowLeft, Send, Crown, Users, Play, Pause } from "lucide-react";
import type { VibeRoomTrackState } from "@/types/vibeRooms";

export default function VibeRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isHost, setIsHost] = useState(false);
  const [spotifyPlayer, setSpotifyPlayer] = useState<SpotifyVibeRoomPlayer | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const {
    room,
    members,
    messages,
    trackState,
    loading,
    error,
    sendMessage,
    setRoom,
    setMessages,
    setTrackState,
    setLoading,
    setError,
  } = useVibeRoom({
    roomId: roomId || "",
    onTrackStateUpdate: useCallback((state: VibeRoomTrackState) => {
      if (!isHost && spotifyPlayer) {
        spotifyPlayer.syncToHostState(state);
      }
    }, [isHost, spotifyPlayer]),
    onMemberJoined: useCallback((member) => {
      toast({
        title: "New member joined",
        description: `${member.profiles?.display_name || "Someone"} joined the room`,
      });
    }, [toast]),
    onNewMessage: useCallback(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []),
  });

  // Get current user and check if host
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user && room) {
        setIsHost(room.host_user_id === user.id);
      }
    };
    checkUser();
  }, [room]);

  useEffect(() => {
    async function fetchRoom() {
      try {
        setLoading(true);
        console.log("Fetching room via POST action=get:", roomId);

      const result = await getRoom(roomId);

      if (result?.success) {
        setRoom(result.room);
        if (result.track_state) setTrackState(result.track_state);
        if (result.messages) setMessages(result.messages);
        } else {
          throw new Error(result?.error || "Failed to load room");
        }
      } catch (err) {
        console.error("Fetch room error:", err);
        setError("Failed to load room");
      } finally {
        setLoading(false);
      }
    }

    fetchRoom();
  }, [roomId, setError, setLoading, setMessages, setRoom, setTrackState]);

  // Initialize Spotify player
  useEffect(() => {
    if (!roomId || !currentUser) return;

    const initSpotify = async () => {
      try {
        // Get Spotify access token (you'll need to implement this based on your auth flow)
        const accessToken = localStorage.getItem("spotify_access_token");
        if (!accessToken) {
          console.warn("No Spotify access token found");
          return;
        }

        const player = new SpotifyVibeRoomPlayer(roomId, isHost);
        await player.initialize(accessToken);
        setSpotifyPlayer(player);

        // Set up state change callback for listeners
        if (!isHost) {
          player.setOnStateChange((state) => {
            // State already handled by useVibeRoom hook
          });
        }
      } catch (error) {
        console.error("Failed to initialize Spotify player:", error);
        toast({
          title: "Spotify Error",
          description: "Failed to connect to Spotify. Make sure you're logged in.",
          variant: "destructive",
        });
      }
    };

    initSpotify();

    return () => {
      if (spotifyPlayer) {
        spotifyPlayer.disconnect();
      }
    };
  }, [roomId, currentUser, isHost, toast]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle typing indicators
  const handleTyping = useCallback(() => {
    if (!currentUser) return;

    setTypingUsers((prev) => new Set(prev).add(currentUser.id));

    // Clear existing timeout
    const existingTimeout = typingTimeoutRef.current.get(currentUser.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout to remove typing indicator
    const timeout = setTimeout(() => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(currentUser.id);
        return next;
      });
      typingTimeoutRef.current.delete(currentUser.id);
    }, 2000);

    typingTimeoutRef.current.set(currentUser.id, timeout);
  }, [currentUser]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !roomId) return;

    try {
      await sendMessage(newMessage);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  async function handleJoin() {
    try {
      const result = await joinRoom(roomId, currentUser?.id);

      if (result?.success) {
        if (result.room) setRoom(result.room);
      } else {
        throw new Error(result?.error || "Failed to join room");
      }
    } catch (err) {
      console.error("Join error:", err);
      setError("Failed to join room");
    }
  }

  const handlePlayTrack = async (trackUri: string) => {
    if (!isHost || !spotifyPlayer) {
      toast({
        title: "Host Only",
        description: "Only the host can control playback",
      });
      return;
    }

    try {
      await spotifyPlayer.playTrack(trackUri, 0);
    } catch (error) {
      console.error("Failed to play track:", error);
      toast({
        title: "Playback Error",
        description: "Failed to play track",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 animate-pulse text-4xl mb-4">🎵</div>
          <p className="text-muted-foreground">Loading vibe room...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <p className="text-destructive mb-4">{error || "Room not found"}</p>
          <Button onClick={() => navigate("/music")}>Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/music")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                {room.name}
                {isHost && (
                  <Badge variant="secondary" className="gap-1">
                    <Crown className="w-3 h-3" />
                    Host
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                {members.length} {members.length === 1 ? "member" : "members"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{members.length}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Visualizer Area */}
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <VibeRoomVisualizer
            isPlaying={trackState?.is_playing || false}
            albumArt={trackState?.track_album_art || null}
          />
        </div>

        {/* Avatar Ring */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-96 h-96">
            {members.slice(0, 8).map((member, index) => {
              const angle = (index / members.length) * 2 * Math.PI;
              const radius = 150;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const isTyping = typingUsers.has(member.user_id);

              return (
                <div
                  key={member.id}
                  className="absolute"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent border-2 ${
                        isTyping
                          ? "border-accent shadow-lg shadow-accent/50 animate-pulse"
                          : "border-background"
                      }`}
                      style={{
                        backgroundImage: member.profiles?.avatar_url
                          ? `url(${member.profiles.avatar_url})`
                          : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {!member.profiles?.avatar_url && (
                        <div className="w-full h-full flex items-center justify-center text-white text-sm font-semibold">
                          {member.profiles?.display_name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Now Playing Section */}
        {trackState?.track_id && (
          <div className="absolute bottom-24 left-0 right-0 px-4">
            <Card className="max-w-md mx-auto p-4 bg-background/90 backdrop-blur border">
              <div className="flex items-center gap-4">
                {trackState.track_album_art && (
                  <img
                    src={trackState.track_album_art}
                    alt={trackState.track_name || "Album art"}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{trackState.track_name || "Unknown Track"}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {trackState.track_artist || "Unknown Artist"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {trackState.is_playing ? (
                    <Pause className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Play className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Chat Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <Card className="bg-background/80 backdrop-blur border max-h-64 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((msg) => {
                  const isCurrentUser = msg.user_id === currentUser?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}
                    >
                      <div className="text-xs text-muted-foreground mb-1">
                        {msg.profiles?.display_name || "Anonymous"}
                      </div>
                      <div
                        className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${
                          isCurrentUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button size="icon" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
