-- Add music preferences to users table (stored in user_metadata via auth.updateUser)
-- This migration is informational - actual storage is in auth.users.user_metadata
-- We add these fields for documentation and potential future direct column access

-- Note: favorite_artists and favorite_genres are stored in user_metadata JSONB
-- Format: favorite_artists: text[] or ["artist:spotify:123", "artist:lastfm:456"]
-- Format: favorite_genres: text[] or ["Afrobeats", "Hip-Hop", "Pop"]

-- No direct ALTER TABLE needed as we use user_metadata
-- This file documents the schema for reference

