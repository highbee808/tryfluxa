-- Add additional columns to match_results for comprehensive data
ALTER TABLE match_results
ADD COLUMN IF NOT EXISTS venue TEXT,
ADD COLUMN IF NOT EXISTS round TEXT,
ADD COLUMN IF NOT EXISTS referee TEXT;

-- Add index for better query performance on venue
CREATE INDEX IF NOT EXISTS idx_match_results_venue ON match_results(venue);

-- Add index for round to help with competition tracking
CREATE INDEX IF NOT EXISTS idx_match_results_round ON match_results(round);