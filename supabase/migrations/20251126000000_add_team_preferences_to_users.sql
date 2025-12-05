-- Add favorite_teams and rival_teams columns to auth.users table
-- These columns store arrays of team names

-- Add favorite_teams column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users' 
    AND column_name = 'favorite_teams'
  ) THEN
    ALTER TABLE auth.users ADD COLUMN favorite_teams text[] DEFAULT '{}';
  END IF;
END $$;

-- Add rival_teams column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users' 
    AND column_name = 'rival_teams'
  ) THEN
    ALTER TABLE auth.users ADD COLUMN rival_teams text[] DEFAULT '{}';
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_favorite_teams ON auth.users USING GIN (favorite_teams);
CREATE INDEX IF NOT EXISTS idx_users_rival_teams ON auth.users USING GIN (rival_teams);

