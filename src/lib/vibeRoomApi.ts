import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function getAccessTokenOrThrow(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Failed to get session", error);
  }
  const token = data?.session?.access_token;
  if (!token) {
    throw new Error("User not authenticated");
  }
  return token;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      throw new Error("User not authenticated");
    }
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function listVibeRooms(): Promise<any[]> {
  const token = await getAccessTokenOrThrow();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/vibe-room/list`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return handleResponse<any[]>(res);
}

export interface CreateVibeRoomPayload {
  name: string;
  privacy?: "public" | "private";
}

export async function createVibeRoom(
  payload: CreateVibeRoomPayload
): Promise<any> {
  const token = await getAccessTokenOrThrow();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/vibe-room/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return handleResponse<any>(res).then((data) => data.room ?? data);
}

export async function joinVibeRoom(roomId: string): Promise<any> {
  const token = await getAccessTokenOrThrow();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/vibe-room/join`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ room_id: roomId }),
  });
  return handleResponse<any>(res);
}

export async function getVibeRoom(roomId: string): Promise<any> {
  const token = await getAccessTokenOrThrow();
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/vibe-room/room/${encodeURIComponent(roomId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  return handleResponse<any>(res).then((data) => data.room ?? data);
}
