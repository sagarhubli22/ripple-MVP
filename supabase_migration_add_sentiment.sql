-- Add sentiment analysis columns to feedback table
-- Run this in your Supabase SQL editor

ALTER TABLE feedback
ADD COLUMN IF NOT EXISTS sentiment TEXT,
ADD COLUMN IF NOT EXISTS highlight_insight TEXT,
ADD COLUMN IF NOT EXISTS highlight_urgency INTEGER;

-- Optional: Add comments for documentation
COMMENT ON COLUMN feedback.sentiment IS 'AI-classified sentiment: positive, neutral, or negative';
COMMENT ON COLUMN feedback.highlight_insight IS 'AI-generated key insight from the feedback';
COMMENT ON COLUMN feedback.highlight_urgency IS 'Urgency score from 1-5, where 5 is most urgent';
