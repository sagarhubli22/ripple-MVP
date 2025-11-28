-- Function to increment summary_generated_count
CREATE OR REPLACE FUNCTION increment_summary_count(event_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE events
  SET summary_generated_count = COALESCE(summary_generated_count, 0) + 1
  WHERE id = event_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
