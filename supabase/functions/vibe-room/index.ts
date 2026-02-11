// supabase/functions/vibe-room/index.ts
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, content-type, apikey, x-client-info, supa-session",
  };
}

export function handleOptions() {
  return new Response("ok", {
    status: 200,
    headers: {
      ...corsHeaders(),
    },
  });
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return handleOptions();
    }

    if (req.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders(),
      });
    }

    const headers = corsHeaders();
    const authHeader = req.headers.get("Authorization") || "";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      {
        global: { headers: { Authorization: authHeader } },
      },
    );

    // Parse JSON body safely
    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {
      body = {};
    }

    const action = body?.action;

    // Resolve user from token
    let userId: string | null = null;
    try {
      const token = authHeader?.replace("Bearer ", "").trim();
      if (token) {
        const { data } = await supabase.auth.getUser(token);
        userId = data?.user?.id ?? null;
      }
    } catch (err) {
      console.error("Auth resolution failed", err);
    }

    console.log("VibeRoom request:", {
      method: req.method,
      action,
      body,
      userId,
    });

    // ---- LIST ROOMS ----
    if (action === "list-rooms") {
      const { data, error } = await supabase
        .from("vibe_room")
        .select("id, name, host_id, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("list-rooms error", error);
        return new Response(
          JSON.stringify({ success: false, error: error.message || "Failed to list rooms" }),
          { status: 200, headers }
        );
      }

      return new Response(JSON.stringify({ success: true, rooms: data ?? [] }), {
        status: 200,
        headers,
      });
    }

    // ---- CREATE ROOM ----
    if (action === "create-room") {
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: "Not authenticated" }),
          { status: 200, headers }
        );
      }

      const name = body?.name || body?.room_name || "Untitled Room";
      const hostId = userId;

      try {
        const { data: room, error } = await supabase
          .from("vibe_room")
          .insert({ name, host_id: hostId })
          .select("id, name, host_id, created_at")
          .single();

        if (error) {
          console.error("create-room insert error", error);
          return new Response(
            JSON.stringify({ success: false, error: error.message || "Failed to create room" }),
            { status: 200, headers }
          );
        }

        // Add host as member (ignore duplicate errors)
        const { error: memberError } = await supabase
          .from("vibe_room_members")
          .insert({ room_id: room.id, user_id: hostId });

        if (memberError) {
          console.error("create-room membership insert error (non-fatal):", memberError.message);
        }

        return new Response(JSON.stringify({ success: true, room }), {
          status: 200,
          headers,
        });
      } catch (err) {
        console.error("create-room unexpected error", err);
        return new Response(
          JSON.stringify({ success: false, error: "Internal error" }),
          { status: 200, headers }
        );
      }
    }

    // ---- GET ROOM ----
    if (action === "get-room") {
      const roomId = body?.room_id || body?.id;
      if (!roomId) {
        return new Response(
          JSON.stringify({ success: false, error: "room_id is required" }),
          { status: 200, headers }
        );
      }

      const { data, error } = await supabase
        .from("vibe_room")
        .select("id, name, host_id, created_at")
        .eq("id", roomId)
        .single();

      if (error) {
        console.error("get-room error", error);
        return new Response(
          JSON.stringify({ success: false, error: error.message || "Failed to load room" }),
          { status: 200, headers }
        );
      }

      return new Response(JSON.stringify({ success: true, room: data }), {
        status: 200,
        headers,
      });
    }

    // ---- JOIN ROOM ----
    if (action === "join-room") {
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: "Not authenticated" }),
          { status: 200, headers }
        );
      }

      const roomId = body?.room_id || body?.id;
      if (!roomId) {
        return new Response(
          JSON.stringify({ success: false, error: "room_id is required" }),
          { status: 200, headers }
        );
      }

      try {
        const { error } = await supabase
          .from("vibe_room_members")
          .insert({ room_id: roomId, user_id: userId });

        if (error && !String(error.message).includes("duplicate")) {
          console.error("join-room insert error", error);
          return new Response(
            JSON.stringify({ success: false, error: error.message || "Failed to join room" }),
            { status: 200, headers }
          );
        }

        const { data: room } = await supabase
          .from("vibe_room")
          .select("id, name, host_id, created_at")
          .eq("id", roomId)
          .single();

        return new Response(JSON.stringify({ success: true, room }), {
          status: 200,
          headers,
        });
      } catch (err) {
        console.error("join-room unexpected error", err);
        return new Response(
          JSON.stringify({ success: false, error: "Internal error" }),
          { status: 200, headers }
        );
      }
    }

    // ---- INVALID ACTION ----
    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { status: 200, headers }
    );
  } catch (err) {
    console.error("Unhandled vibe-room error", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal error" }),
      { status: 200, headers: corsHeaders() }
    );
  }
});
