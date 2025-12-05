/**
 * Vibe Rooms API client
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  VibeRoom,
  CreateRoomRequest,
  JoinRoomRequest,
  LeaveRoomRequest,
  UpdateTrackStateRequest,
} from "@/types/vibeRooms";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Create a new vibe room
 */
export async function createVibeRoom(data: CreateRoomRequest): Promise<VibeRoom> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase configuration");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/vibe-room/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create room");
  }

  const result = await response.json();
  return result.room;
}

/**
 * Join a vibe room
 */
export async function joinVibeRoom(data: JoinRoomRequest): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase configuration");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/vibe-room/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to join room");
  }
}

/**
 * Leave a vibe room
 */
export async function leaveVibeRoom(data: LeaveRoomRequest): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase configuration");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/vibe-room/leave`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to leave room");
  }
}

/**
 * Update track state (host only)
 */
export async function updateTrackState(data: UpdateTrackStateRequest): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase configuration");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/vibe-room/update-track-state`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update track state");
  }
}

/**
 * List public rooms
 */
export async function listPublicRooms(): Promise<VibeRoom[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase configuration");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/vibe-room/list`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to list rooms");
  }

  const result = await response.json();
  return result.rooms || [];
}

/**
 * Get room details
 */
export async function getRoomDetails(roomId: string): Promise<VibeRoom> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase configuration");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/vibe-room/room/${roomId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get room details");
  }

  const result = await response.json();
  return result.room;
}

/**
 * Send a message in a room
 */
export async function sendRoomMessage(roomId: string, message: string): Promise<void> {
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
}
