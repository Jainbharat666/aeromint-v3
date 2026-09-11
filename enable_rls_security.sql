-- ==============================================================================
-- AEROMINT V3 — FIX CRITICAL PUBLIC ACCESS VULNERABILITY (ENABLE RLS)
-- Project: aeromint-v3 (zfsyokzedsdofmtmjtqt)
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard/project/zfsyokzedsdofmtmjtqt/sql
-- 2. Click "New Query", paste this code and click "Run" (Ctrl + Enter).

-- 1. Enable Row Level Security on all core tables
ALTER TABLE IF EXISTS public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_user_configs ENABLE ROW LEVEL SECURITY;

-- 2. Drop any legacy wide-open policies if present
DROP POLICY IF EXISTS "Allow all for anon" ON public.app_users;
DROP POLICY IF EXISTS "Allow all for anon" ON public.app_invites;
DROP POLICY IF EXISTS "Allow all for anon" ON public.app_user_configs;

-- 3. Service role bypass verification
-- Note: In Supabase, the 'service_role' key inherently bypasses RLS.
-- With no public policies, all unauthorized public internet / anon requests are completely blocked.
