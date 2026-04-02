-- Migration 005 : Push notifications infrastructure

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT, -- 'ios' | 'android'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push token" ON push_tokens
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT, -- 'order_confirmed' | 'order_ready' | 'points_earned' | 'level_up' | 'challenge_completed'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON notification_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert notifications" ON notification_log
  FOR INSERT WITH CHECK (true);
