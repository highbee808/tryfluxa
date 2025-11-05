-- Clean up duplicate NBA team entities (keep abbreviations, remove full names)
-- This fixes the data accuracy issue where teams appear twice

-- First, delete any data_monitor_log entries referencing the duplicates
DELETE FROM data_monitor_log
WHERE entity_id IN (
  SELECT id FROM fan_entities
  WHERE category = 'sports' 
    AND stats->>'league' = 'NBA'
    AND name IN (
      'Dallas Mavericks', 'Phoenix Suns', 
      'Philadelphia 76ers', 'Milwaukee Bucks',
      'Los Angeles Lakers', 'Boston Celtics',
      'Golden State Warriors', 'Miami Heat',
      'Brooklyn Nets', 'Denver Nuggets',
      'Memphis Grizzlies', 'Cleveland Cavaliers',
      'New York Knicks', 'Sacramento Kings',
      'LA Clippers', 'Minnesota Timberwolves',
      'Oklahoma City Thunder', 'New Orleans Pelicans',
      'Indiana Pacers', 'Atlanta Hawks',
      'Chicago Bulls', 'Toronto Raptors',
      'Houston Rockets', 'Utah Jazz',
      'San Antonio Spurs', 'Portland Trail Blazers',
      'Orlando Magic', 'Washington Wizards',
      'Charlotte Hornets', 'Detroit Pistons'
    )
);

-- Now delete full-name duplicates for NBA teams
DELETE FROM fan_entities 
WHERE category = 'sports' 
  AND stats->>'league' = 'NBA'
  AND name IN (
    'Dallas Mavericks', 'Phoenix Suns', 
    'Philadelphia 76ers', 'Milwaukee Bucks',
    'Los Angeles Lakers', 'Boston Celtics',
    'Golden State Warriors', 'Miami Heat',
    'Brooklyn Nets', 'Denver Nuggets',
    'Memphis Grizzlies', 'Cleveland Cavaliers',
    'New York Knicks', 'Sacramento Kings',
    'LA Clippers', 'Minnesota Timberwolves',
    'Oklahoma City Thunder', 'New Orleans Pelicans',
    'Indiana Pacers', 'Atlanta Hawks',
    'Chicago Bulls', 'Toronto Raptors',
    'Houston Rockets', 'Utah Jazz',
    'San Antonio Spurs', 'Portland Trail Blazers',
    'Orlando Magic', 'Washington Wizards',
    'Charlotte Hornets', 'Detroit Pistons'
  );

-- Add unique constraint to prevent future duplicates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_entity_slug_category'
  ) THEN
    ALTER TABLE fan_entities 
    ADD CONSTRAINT unique_entity_slug_category 
    UNIQUE (slug, category);
  END IF;
END $$;