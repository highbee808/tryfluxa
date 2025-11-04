-- Add new columns to fan_entities for enhanced team pages
ALTER TABLE fan_entities
ADD COLUMN IF NOT EXISTS primary_color TEXT,
ADD COLUMN IF NOT EXISTS secondary_color TEXT,
ADD COLUMN IF NOT EXISTS news_feed JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS current_match JSONB;

-- Update stats and achievements to be more detailed
COMMENT ON COLUMN fan_entities.stats IS 'Store key stats like current league position, points, etc.';
COMMENT ON COLUMN fan_entities.achievements IS 'Store major trophies like [{"name": "Champions League", "count": 5}, {"name": "La Liga", "count": 30}]';
COMMENT ON COLUMN fan_entities.current_match IS 'Store current/upcoming match details with live scores';
COMMENT ON COLUMN fan_entities.news_feed IS 'Store latest official news and updates';

-- Create index for faster current match queries
CREATE INDEX IF NOT EXISTS idx_fan_entities_current_match ON fan_entities USING gin(current_match);
CREATE INDEX IF NOT EXISTS idx_fan_entities_news_feed ON fan_entities USING gin(news_feed);