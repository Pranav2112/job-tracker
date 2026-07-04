-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004: delete_user RPC
-- Allows a user to delete their own account from a client-side call.
-- SECURITY DEFINER runs as the function owner (postgres), which has the
-- privilege to delete from auth.users. The auth.uid() check ensures a user
-- can only delete themselves — never anyone else.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Cascades to all tables with ON DELETE CASCADE (applications, documents, etc.)
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Revoke from public, grant only to authenticated users
REVOKE ALL ON FUNCTION public.delete_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;
