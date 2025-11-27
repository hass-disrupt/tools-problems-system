-- Create slack_users table to track Slack users and their welcome message status
CREATE TABLE IF NOT EXISTS slack_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_user_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  welcome_message_sent BOOLEAN DEFAULT false,
  welcome_message_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(slack_user_id, team_id)
);

-- Create index for quick lookups by slack_user_id and team_id
CREATE INDEX IF NOT EXISTS idx_slack_users_user_team ON slack_users(slack_user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_slack_users_welcome_sent ON slack_users(welcome_message_sent);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_slack_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_slack_users_updated_at
  BEFORE UPDATE ON slack_users
  FOR EACH ROW
  EXECUTE FUNCTION update_slack_users_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE slack_users ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we need to read/write from API routes)
CREATE POLICY "Allow public read access on slack_users" ON slack_users
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on slack_users" ON slack_users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on slack_users" ON slack_users
  FOR UPDATE USING (true);

