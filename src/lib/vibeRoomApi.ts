import { supabase } from "../integrations/supabase/client";

// Base URL for the edge function
const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vibe-room`;

async function makeRequest(action: string, body: any = {}) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    },
    body: JSON.stringify({ action, ...body }),
  });
  return res.json();
}

// ✔ Exported API functions (must match imports across the app)
export async function listRooms() {
  return makeRequest("list-rooms");
}

export async function createRoom(name: string, host_user_id: string) {
  return makeRequest("create-room", { name, host_user_id });
}

export async function getRoom(room_id: string) {
  return makeRequest("get-room", { room_id });
}

export async function joinRoom(room_id: string, user_id: string) {
  return makeRequest("join-room", { room_id, user_id });
}
