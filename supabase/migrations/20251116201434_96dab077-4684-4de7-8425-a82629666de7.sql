-- Auto-create gamification profile for new users

CREATE OR REPLACE FUNCTION create_user_gamification_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_gamification (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create gamification profile when user signs up
DROP TRIGGER IF EXISTS on_user_created_gamification ON auth.users;
CREATE TRIGGER on_user_created_gamification
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_gamification_profile();