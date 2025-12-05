/**
 * Vibe Rooms API client
 */

import { supabase } from "@/integrations/supabase/client";
import { getApiBaseUrl, getDefaultHeaders } from "./apiConfig";
import type {
  VibeRoom,
  CreateRoomRequest,
  JoinRoomRequest,
  LeaveRoomRequest,
  UpdateTrackStateRequest,
} from "@/types/vibeRooms";

/**
 * Create a new vibe room
 */
export async function createVibeRoom(data: CreateRoomRequest): Promise<VibeRoom> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/vibe-room/create`, {
    method: "POST",
    headers: getDefaultHeaders(),
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/vibe-room/join`, {
    method: "POST",
    headers: getDefaultHeaders(),
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/vibe-room/leave`, {
    method: "POST",
    headers: getDefaultHeaders(),
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/vibe-room/update-track-state`, {
    method: "POST",
    headers: getDefaultHeaders(),
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
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/vibe-room/list`, {
    method: "GET",
    headers: getDefaultHeaders(),
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
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/vibe-room/room/${roomId}`, {
    method: "GET",
    headers: getDefaultHeaders(),
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
