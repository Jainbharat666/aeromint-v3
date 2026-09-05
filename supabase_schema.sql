-- ==============================================================================
-- AEROMINT BOT WEB SAAS — SUPABASE DATABASE SCHEMA & SECURITY POLICIES
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- to initialize all required tables, security policies (RLS), and indexes.

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER ENCRYPTED VAULTS TABLE
-- Stores non-custodial AES-GCM encrypted wallet sessions per user.
CREATE TABLE IF NOT EXISTS public.user_vaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    encrypted_data JSONB NOT NULL,
    wallet_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_vaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own vault"
    ON public.user_vaults
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault"
    ON public.user_vaults
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault"
    ON public.user_vaults
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault"
    ON public.user_vaults
    FOR DELETE
    USING (auth.uid() = user_id);


-- 3. USER CUSTOM RPCS TABLE
-- Stores user-specific custom RPC endpoints.
CREATE TABLE IF NOT EXISTS public.user_custom_rpcs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    network_key VARCHAR(64) NOT NULL DEFAULT 'robinhood',
    name VARCHAR(128) NOT NULL,
    url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_custom_rpcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own custom rpcs"
    ON public.user_custom_rpcs
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 4. USER MINT PROFILES TABLE
-- Stores saved mint presets and configuration profiles per user.
CREATE TABLE IF NOT EXISTS public.user_mint_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    profile_name VARCHAR(128) NOT NULL,
    profile_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_mint_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profiles"
    ON public.user_mint_profiles
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 5. APP ACCESS INVITE CODES TABLE
-- Controls who can register / access the bot.
CREATE TABLE IF NOT EXISTS public.app_access_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invite_code VARCHAR(64) UNIQUE NOT NULL,
    note VARCHAR(255),
    validity_days INTEGER DEFAULT 30,
    expires_at TIMESTAMP WITH TIME ZONE,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.app_access_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can check invite codes"
    ON public.app_access_invites
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admin can manage all invite codes"
    ON public.app_access_invites
    FOR ALL
    USING (auth.email() = 'jainbharat666@gmail.com' OR auth.role() = 'service_role')
    WITH CHECK (auth.email() = 'jainbharat666@gmail.com' OR auth.role() = 'service_role');


-- 6. USER PROFILES & SUBSCRIPTION VALIDITY TABLE
-- Tracks all users, their role, active validity, and mint analytics.
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'vip_member',
    invite_code_used VARCHAR(64),
    valid_until TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    is_banned BOOLEAN DEFAULT false,
    total_mints INTEGER DEFAULT 0,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = user_id OR auth.email() = 'jainbharat666@gmail.com' OR auth.role() = 'service_role');

CREATE POLICY "Allow user profile creation on signup"
    ON public.user_profiles
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update own profile stats"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = user_id OR auth.email() = 'jainbharat666@gmail.com' OR auth.role() = 'service_role')
    WITH CHECK (auth.uid() = user_id OR auth.email() = 'jainbharat666@gmail.com' OR auth.role() = 'service_role');

CREATE POLICY "Admin can manage all user profiles"
    ON public.user_profiles
    FOR ALL
    USING (auth.email() = 'jainbharat666@gmail.com' OR auth.role() = 'service_role')
    WITH CHECK (auth.email() = 'jainbharat666@gmail.com' OR auth.role() = 'service_role');


-- 7. AUTOMATIC UPDATED_AT TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_vaults_updated
    BEFORE UPDATE ON public.user_vaults
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_user_profiles_updated
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- ==============================================================================
-- INITIAL MASTER INVITE CODES
-- ==============================================================================
INSERT INTO public.app_access_invites (invite_code, note, validity_days, max_uses)
VALUES ('AERO-VIP-ACCESS-2026', 'Master VIP Access Key (365 Days)', 365, 500)
ON CONFLICT (invite_code) DO NOTHING;
