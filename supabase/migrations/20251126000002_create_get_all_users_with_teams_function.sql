-- Create helper function for edge functions to get users with team preferences
-- This function returns users who have a specific team in their favorites or rivals

CREATE OR REPLACE FUNCTION public.get_all_users_with_teams(p_team_name text)
RETURNS TABLE(
  user_id uuid,
  is_favorite boolean,
  is_rival boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    COALESCE(p_team_name = ANY(u.favorite_teams), false) as is_favorite,
    COALESCE(p_team_name = ANY(u.rival_teams), false) as is_rival
  FROM auth.users u
  WHERE 
    p_team_name = ANY(COALESCE(u.favorite_teams, '{}'::text[])) OR
    p_team_name = ANY(COALESCE(u.rival_teams, '{}'::text[]));
END;
$$;

-- Grant execute permission to service role (for edge functions)
GRANT EXECUTE ON FUNCTION public.get_all_users_with_teams(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_all_users_with_teams(text) TO authenticated;

