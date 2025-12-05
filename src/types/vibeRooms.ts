/**
 * TypeScript types for Vibe Rooms feature
 */

export type VibeRoomPrivacy = "public" | "private";

export interface VibeRoom {
  id: string;
  name: string;
  privacy: VibeRoomPrivacy;
  host_user_id: string;
  created_at: string;
  updated_at: string;
  vibe_room_members?: VibeRoomMember[];
  vibe_room_track_state?: VibeRoomTrackState | null;
}

export interface VibeRoomMember {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  profiles?: {
    user_id: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export interface VibeRoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  timestamp: string;
  profiles?: {
    user_id: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export interface VibeRoomTrackState {
  room_id: string;
  track_id: string | null;
  track_name: string | null;
  track_artist: string | null;
  track_album_art: string | null;
  position_ms: number;
  is_playing: boolean;
  updated_at: string;
}

export interface CreateRoomRequest {
  name: string;
  privacy?: VibeRoomPrivacy;
}

export interface JoinRoomRequest {
  room_id: string;
}

export interface LeaveRoomRequest {
  room_id: string;
}

export interface UpdateTrackStateRequest {
  room_id: string;
  track_id?: string;
  track_name?: string;
  track_artist?: string;
  track_album_art?: string;
  position_ms: number;
  is_playing: boolean;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  uri: string;
}
