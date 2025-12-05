import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, createErrorResponse, createResponse, parseBody } from "../_shared/http.ts";
import { ENV } from "../_shared/env.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createErrorResponse("Missing authorization header", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(ENV.VITE_SUPABASE_URL, ENV.VITE_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return createErrorResponse("Unauthorized", 401);
    }

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop() || "";
    const body = await parseBody(req);

    switch (req.method) {
      case "POST":
        if (path === "create") {
          return await createRoom(supabase, user.id, body);
        } else if (path === "join") {
          return await joinRoom(supabase, user.id, body);
        } else if (path === "leave") {
          return await leaveRoom(supabase, user.id, body);
        } else if (path === "update-track-state") {
          return await updateTrackState(supabase, user.id, body);
        }
        break;

      case "GET":
        if (path === "list") {
          return await listPublicRooms(supabase);
        } else if (path.startsWith("room/")) {
          const roomId = path.split("/")[1];
          return await getRoomDetails(supabase, roomId);
        }
        break;
    }

    return createErrorResponse("Invalid endpoint", 404);
  } catch (error) {
    console.error("Vibe room error:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});

async function createRoom(supabase: any, userId: string, body: any) {
  const { name, privacy = "public" } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return createErrorResponse("Room name is required", 400);
  }

  if (privacy !== "public" && privacy !== "private") {
    return createErrorResponse("Privacy must be 'public' or 'private'", 400);
  }

  const { data: room, error } = await supabase
    .from("vibe_rooms")
    .insert({
      name: name.trim(),
      privacy,
      host_user_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating room:", error);
    return createErrorResponse("Failed to create room", 500);
  }

  // Auto-join the host
  await supabase.from("vibe_room_members").insert({
    room_id: room.id,
    user_id: userId,
  });

  return createResponse({ success: true, room }, 201);
}

async function joinRoom(supabase: any, userId: string, body: any) {
  const { room_id } = body;

  if (!room_id) {
    return createErrorResponse("room_id is required", 400);
  }

  // Check if room exists and is public
  const { data: room, error: roomError } = await supabase
    .from("vibe_rooms")
    .select("*")
    .eq("id", room_id)
    .single();

  if (roomError || !room) {
    return createErrorResponse("Room not found", 404);
  }

  if (room.privacy === "private" && room.host_user_id !== userId) {
    return createErrorResponse("Cannot join private room", 403);
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("vibe_room_members")
    .select("*")
    .eq("room_id", room_id)
    .eq("user_id", userId)
    .single();

  if (existing) {
    return createResponse({ success: true, message: "Already a member" });
  }

  // Join room
  const { error } = await supabase.from("vibe_room_members").insert({
    room_id,
    user_id: userId,
  });

  if (error) {
    console.error("Error joining room:", error);
    return createErrorResponse("Failed to join room", 500);
  }

  return createResponse({ success: true });
}

async function leaveRoom(supabase: any, userId: string, body: any) {
  const { room_id } = body;

  if (!room_id) {
    return createErrorResponse("room_id is required", 400);
  }

  // Check if user is the host
  const { data: room } = await supabase
    .from("vibe_rooms")
    .select("host_user_id")
    .eq("id", room_id)
    .single();

  if (room && room.host_user_id === userId) {
    return createErrorResponse("Host cannot leave room. Delete the room instead.", 400);
  }

  const { error } = await supabase
    .from("vibe_room_members")
    .delete()
    .eq("room_id", room_id)
    .eq("user_id", userId);

  if (error) {
    console.error("Error leaving room:", error);
    return createErrorResponse("Failed to leave room", 500);
  }

  return createResponse({ success: true });
}

async function updateTrackState(supabase: any, userId: string, body: any) {
  const { room_id, track_id, track_name, track_artist, track_album_art, position_ms, is_playing } = body;

  if (!room_id) {
    return createErrorResponse("room_id is required", 400);
  }

  // Verify user is the host
  const { data: room } = await supabase
    .from("vibe_rooms")
    .select("host_user_id")
    .eq("id", room_id)
    .single();

  if (!room || room.host_user_id !== userId) {
    return createErrorResponse("Only the host can update track state", 403);
  }

  const { error } = await supabase
    .from("vibe_room_track_state")
    .upsert({
      room_id,
      track_id: track_id || null,
      track_name: track_name || null,
      track_artist: track_artist || null,
      track_album_art: track_album_art || null,
      position_ms: position_ms || 0,
      is_playing: is_playing ?? false,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "room_id",
    });

  if (error) {
    console.error("Error updating track state:", error);
    return createErrorResponse("Failed to update track state", 500);
  }

  return createResponse({ success: true });
}

async function listPublicRooms(supabase: any) {
  const { data: rooms, error } = await supabase
    .from("vibe_rooms")
    .select(`
      *,
      vibe_room_members(count),
      vibe_room_track_state(*)
    `)
    .eq("privacy", "public")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error listing rooms:", error);
    return createErrorResponse("Failed to list rooms", 500);
  }

  return createResponse({ success: true, rooms: rooms || [] });
}

async function getRoomDetails(supabase: any, roomId: string) {
  const { data: room, error } = await supabase
    .from("vibe_rooms")
    .select(`
      *,
      vibe_room_members(
        id,
        user_id,
        joined_at
      ),
      vibe_room_track_state(*)
    `)
    .eq("id", roomId)
    .single();

  // Fetch profiles for members separately (profiles table uses user_id, not id)
  if (room && room.vibe_room_members) {
    const userIds = room.vibe_room_members.map((m: any) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    if (profiles) {
      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));
      room.vibe_room_members = room.vibe_room_members.map((m: any) => ({
        ...m,
        profiles: profileMap.get(m.user_id),
      }));
    }
  }

  if (error || !room) {
    return createErrorResponse("Room not found", 404);
  }

  return createResponse({ success: true, room });
}
