/**
 * React hook for Vibe Room real-time updates
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  VibeRoom,
  VibeRoomMember,
  VibeRoomMessage,
  VibeRoomTrackState,
} from "@/types/vibeRooms";

interface UseVibeRoomOptions {
  roomId: string;
  onTrackStateUpdate?: (state: VibeRoomTrackState) => void;
  onMemberJoined?: (member: VibeRoomMember) => void;
  onMemberLeft?: (userId: string) => void;
  onNewMessage?: (message: VibeRoomMessage) => void;
}

export function useVibeRoom(options: UseVibeRoomOptions) {
  const { roomId, onTrackStateUpdate, onMemberJoined, onMemberLeft, onNewMessage } = options;
  const [room, setRoom] = useState<VibeRoom | null>(null);
  const [members, setMembers] = useState<VibeRoomMember[]>([]);
  const [messages, setMessages] = useState<VibeRoomMessage[]>([]);
  const [trackState, setTrackState] = useState<VibeRoomTrackState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelsRef = useRef<any[]>([]);

  // Fetch initial room data
  useEffect(() => {
    if (!roomId) return;

    const fetchRoom = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch room details
        const { data: roomData, error: roomError } = await supabase
          .from("vibe_rooms")
          .select(`
            *,
            vibe_room_members(
              id,
              user_id,
              joined_at,
              profiles:user_id(id, username, avatar_url)
            ),
            vibe_room_track_state(*)
          `)
          .eq("id", roomId)
          .single();

        if (roomError) throw roomError;

        setRoom(roomData as VibeRoom);
        setMembers((roomData as any).vibe_room_members || []);
        setTrackState((roomData as any).vibe_room_track_state || null);

        // Fetch recent messages
        const { data: messagesData, error: messagesError } = await supabase
          .from("vibe_room_messages")
          .select(`
            *,
            profiles:user_id(id, username, avatar_url)
          `)
          .eq("room_id", roomId)
          .order("timestamp", { ascending: false })
          .limit(50);

        if (!messagesError && messagesData) {
          setMessages(messagesData.reverse() as VibeRoomMessage[]);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching room:", err);
        setError(err instanceof Error ? err.message : "Failed to load room");
        setLoading(false);
      }
    };

    fetchRoom();
  }, [roomId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!roomId) return;

    // Room updates channel
    const roomChannel = supabase
      .channel(`vibe-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "vibe_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          setRoom(payload.new as VibeRoom);
        }
      )
      .subscribe();

    // Track state updates channel
    const trackStateChannel = supabase
      .channel(`vibe-room-track-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vibe_room_track_state",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newState = payload.new as VibeRoomTrackState;
          setTrackState(newState);
          onTrackStateUpdate?.(newState);
        }
      )
      .subscribe();

    // Members channel
    const membersChannel = supabase
      .channel(`vibe-room-members-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vibe_room_members",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMember = payload.new as VibeRoomMember;
          // Fetch member profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .eq("user_id", newMember.user_id)
            .single();

          const memberWithProfile = {
            ...newMember,
            profiles: profile || undefined,
          };

          setMembers((prev) => {
            if (prev.find((m) => m.user_id === newMember.user_id)) {
              return prev;
            }
            return [...prev, memberWithProfile];
          });
          onMemberJoined?.(memberWithProfile);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "vibe_room_members",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const oldMember = payload.old as VibeRoomMember;
          setMembers((prev) => prev.filter((m) => m.user_id !== oldMember.user_id));
          onMemberLeft?.(oldMember.user_id);
        }
      )
      .subscribe();

    // Messages channel
    const messagesChannel = supabase
      .channel(`vibe-room-messages-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vibe_room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMessage = payload.new as VibeRoomMessage;
          // Fetch user profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .eq("user_id", newMessage.user_id)
            .single();

          const messageWithProfile = {
            ...newMessage,
            profiles: profile || undefined,
          };

          setMessages((prev) => [...prev, messageWithProfile]);
          onNewMessage?.(messageWithProfile);
        }
      )
      .subscribe();

    channelsRef.current = [roomChannel, trackStateChannel, membersChannel, messagesChannel];

    return () => {
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [roomId, onTrackStateUpdate, onMemberJoined, onMemberLeft, onNewMessage]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase.from("vibe_room_messages").insert({
        room_id: roomId,
        user_id: user.id,
        message: message.trim(),
      });

      if (error) {
        throw new Error(error.message || "Failed to send message");
      }
    },
    [roomId]
  );

  return {
    room,
    members,
    messages,
    trackState,
    loading,
    error,
    sendMessage,
  };
}
