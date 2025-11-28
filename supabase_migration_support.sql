-- Create support_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_id UUID REFERENCES events(id), -- Nullable by default
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature')),
  status TEXT DEFAULT 'new' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure idempotency (avoid "policy already exists" error)
DROP POLICY IF EXISTS "Allow public insert to support_messages" ON support_messages;
DROP POLICY IF EXISTS "Users can view their own support messages" ON support_messages;

-- Policy: Allow anyone to insert (for pre-login support)
CREATE POLICY "Allow public insert to support_messages"
  ON support_messages
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can view their own support messages
CREATE POLICY "Users can view their own support messages"
  ON support_messages
  FOR SELECT
  USING (auth.uid() = user_id);
