-- Add awareness and personality fields to fluxa_memory
ALTER TABLE fluxa_memory
ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_gist_played UUID,
ADD COLUMN IF NOT EXISTS preferred_time TEXT;

-- Create fluxa_lines table for personality-driven voice lines
CREATE TABLE IF NOT EXISTS fluxa_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  mood TEXT NOT NULL,
  line TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE fluxa_lines ENABLE ROW LEVEL SECURITY;

-- Anyone can view fluxa lines
CREATE POLICY "Anyone can view fluxa lines"
ON fluxa_lines FOR SELECT
USING (true);

-- Only admins can manage fluxa lines
CREATE POLICY "Only admins can manage fluxa lines"
ON fluxa_lines FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert initial Fluxa personality lines
INSERT INTO fluxa_lines (category, mood, line) VALUES
-- Greetings
('greeting', 'morning', 'Morning sunshine ☀️, I''ve got some fresh gist for you.'),
('greeting', 'morning', 'Rise and gist, bestie! ☕ Let''s catch up.'),
('greeting', 'afternoon', 'Afternoon vibes 🌤️ — ready for some tea?'),
('greeting', 'evening', 'Evening bestie 🌙 — let''s wind down with some gist.'),
('greeting', 'night', 'Late night gist session? I''m here for it 💫'),

-- Streak celebrations
('streak', 'hype', 'You''re on a ${streakCount}-day streak! 🔥 Unstoppable!'),
('streak', 'hype', 'Gist legend alert! 👑 ${streakCount} days strong!'),
('streak', 'warm', 'Back again? Love the loyalty, bestie 💕'),

-- Welcome
('welcome', 'warm', 'Welcome to Fluxa 💕 Let''s gist together!'),
('welcome', 'playful', 'Hey new bestie! Ready to dive into the gist? 👀'),

-- Returning
('returning', 'excited', 'Missed you! I kept your seat warm 🥹'),
('returning', 'tease', 'It''s been a while, bestie 😭 Where''ve you been?'),
('returning', 'playful', 'You''re back! Let me catch you up on everything 💬'),

-- After gist
('after_gist', 'funny', 'That one was wild, right? 😂'),
('after_gist', 'tease', 'Hold up — this next gist might blow your mind 😏'),
('after_gist', 'warm', 'Good one, yeah? Want more? 💅'),

-- Idle
('idle', 'tease', 'Aww, taking a break? Don''t keep me waiting too long 💋'),
('idle', 'soft', 'I''ll be here when you''re ready, bestie 🌸'),
('idle', 'playful', 'Hello? You still there? 👀');

-- Add index for faster lookups
CREATE INDEX idx_fluxa_lines_category_mood ON fluxa_lines(category, mood);