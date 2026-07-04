-- Gamification table: streaks, season goal, bonus XP
CREATE TABLE IF NOT EXISTS user_gamification (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak  INT          NOT NULL DEFAULT 1,
  longest_streak  INT          NOT NULL DEFAULT 1,
  last_activity_date DATE      NOT NULL DEFAULT CURRENT_DATE,
  season_goal     INT          NOT NULL DEFAULT 50,
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_gamification"
  ON user_gamification
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_user_gamification_updated_at
  BEFORE UPDATE ON user_gamification
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
