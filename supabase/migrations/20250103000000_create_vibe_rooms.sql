-- ============================================
-- VIBE ROOMS FEATURE - Database Schema
-- Phase 1: MVP Listening Party Feature
-- ============================================

-- Create privacy enum
CREATE TYPE public.vibe_room_privacy AS ENUM ('public', 'private');

-- Create vibe_rooms table
CREATE TABLE IF NOT EXISTS public.vibe_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  privacy vibe_room_privacy NOT NULL DEFAULT 'public',
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create vibe_room_members table
CREATE TABLE IF NOT EXISTS public.vibe_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.vibe_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Create vibe_room_messages table
CREATE TABLE IF NOT EXISTS public.vibe_room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.vibe_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create vibe_room_track_state table
CREATE TABLE IF NOT EXISTS public.vibe_room_track_state (
  room_id UUID PRIMARY KEY REFERENCES public.vibe_rooms(id) ON DELETE CASCADE,
  track_id TEXT,
  track_name TEXT,
  track_artist TEXT,
  track_album_art TEXT,
  position_ms INTEGER DEFAULT 0,
  is_playing BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vibe_rooms_host ON public.vibe_rooms(host_user_id);
CREATE INDEX IF NOT EXISTS idx_vibe_rooms_privacy ON public.vibe_rooms(privacy);
CREATE INDEX IF NOT EXISTS idx_vibe_room_members_room ON public.vibe_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_vibe_room_members_user ON public.vibe_room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_vibe_room_messages_room ON public.vibe_room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_vibe_room_messages_timestamp ON public.vibe_room_messages(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE public.vibe_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_room_track_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vibe_rooms
CREATE POLICY "Users can view public rooms"
  ON public.vibe_rooms FOR SELECT
  USING (privacy = 'public' OR host_user_id = auth.uid());

CREATE POLICY "Users can create rooms"
  ON public.vibe_rooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Host can update their room"
  ON public.vibe_rooms FOR UPDATE
  USING (host_user_id = auth.uid());

CREATE POLICY "Host can delete their room"
  ON public.vibe_rooms FOR DELETE
  USING (host_user_id = auth.uid());

-- RLS Policies for vibe_room_members
CREATE POLICY "Users can view members of rooms they're in"
  ON public.vibe_room_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vibe_room_members vrm
      WHERE vrm.room_id = vibe_room_members.room_id
      AND vrm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join rooms"
  ON public.vibe_room_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can leave rooms"
  ON public.vibe_room_members FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for vibe_room_messages
CREATE POLICY "Users can view messages in rooms they're in"
  ON public.vibe_room_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vibe_room_members vrm
      WHERE vrm.room_id = vibe_room_messages.room_id
      AND vrm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in rooms they're in"
  ON public.vibe_room_messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.vibe_room_members vrm
      WHERE vrm.room_id = vibe_room_messages.room_id
      AND vrm.user_id = auth.uid()
    )
  );

-- RLS Policies for vibe_room_track_state
CREATE POLICY "Users can view track state in rooms they're in"
  ON public.vibe_room_track_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vibe_room_members vrm
      WHERE vrm.room_id = vibe_room_track_state.room_id
      AND vrm.user_id = auth.uid()
    )
  );

CREATE POLICY "Host can update track state"
  ON public.vibe_room_track_state FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.vibe_rooms vr
      WHERE vr.id = vibe_room_track_state.room_id
      AND vr.host_user_id = auth.uid()
    )
  );

CREATE POLICY "Host can insert track state"
  ON public.vibe_room_track_state FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vibe_rooms vr
      WHERE vr.id = vibe_room_track_state.room_id
      AND vr.host_user_id = auth.uid()
    )
  );

-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.vibe_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vibe_room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vibe_room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vibe_room_track_state;
