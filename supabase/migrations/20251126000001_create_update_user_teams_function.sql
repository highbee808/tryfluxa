-- Create RPC function to update user team preferences in auth.users
-- This allows the client to update favorite_teams and rival_teams

CREATE OR REPLACE FUNCTION public.update_user_teams(
  p_favorite_teams text[],
  p_rival_teams text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE auth.users
  SET 
    favorite_teams = p_favorite_teams,
    rival_teams = p_rival_teams,
    updated_at = now()
  WHERE id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_teams(text[], text[]) TO authenticated;

-- Create function to get user teams
CREATE OR REPLACE FUNCTION public.get_user_teams()
RETURNS TABLE(
  favorite_teams text[],
  rival_teams text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(u.favorite_teams, '{}'::text[]) as favorite_teams,
    COALESCE(u.rival_teams, '{}'::text[]) as rival_teams
  FROM auth.users u
  WHERE u.id = auth.uid();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_teams() TO authenticated;

