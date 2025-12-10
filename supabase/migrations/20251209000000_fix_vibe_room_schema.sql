-- Ensure vibe_room table exists
CREATE TABLE IF NOT EXISTS vibe_room (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id uuid NOT NULL,
    name text,
    created_at timestamp with time zone DEFAULT now()
);

-- Ensure vibe_room_members exists
CREATE TABLE IF NOT EXISTS vibe_room_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid REFERENCES vibe_room(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now()
);

-- Clean up orphaned members (members referencing non-existent rooms)
DELETE FROM vibe_room_members
WHERE room_id NOT IN (SELECT id FROM vibe_room);

-- Fix FK relationship errors seen in logs
ALTER TABLE vibe_room_members
    DROP CONSTRAINT IF EXISTS vibe_room_members_room_id_fkey,
    ADD CONSTRAINT vibe_room_members_room_id_fkey
        FOREIGN KEY (room_id)
        REFERENCES vibe_room(id)
        ON DELETE CASCADE;

-- Enforce one membership per user per room
CREATE UNIQUE INDEX IF NOT EXISTS vibe_room_member_unique
    ON vibe_room_members(room_id, user_id);

COMMENT ON TABLE vibe_room IS 'Vibe room';
COMMENT ON TABLE vibe_room_members IS 'Vibe room members';
