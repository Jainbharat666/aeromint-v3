-- ==============================================================================
-- AEROMINT VERSION 3 — COMPLETE SUPABASE CLOUD DATABASE SCHEMA
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/zfsyokzedsdofmtmjtqt/sql
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. APP USERS TABLE (Accounts, Master Admin, Quota, Expiry)
CREATE TABLE IF NOT EXISTS public.app_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    invite_code_used TEXT,
    valid_until TIMESTAMPTZ,
    max_mints_allowed INT DEFAULT 0,
    total_mints INT DEFAULT 0,
    is_banned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. APP INVITES TABLE (VIP Access & Registration Codes)
CREATE TABLE IF NOT EXISTS public.app_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_code TEXT UNIQUE NOT NULL,
    note TEXT,
    validity_days INT DEFAULT 30,
    expires_at TIMESTAMPTZ,
    max_uses INT DEFAULT 1,
    used_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. APP USER CONFIGS TABLE (Cloud Vault Sync & Session Persistence)
CREATE TABLE IF NOT EXISTS public.app_user_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. USER VAULTS TABLE (Encrypted Wallet Storage)
CREATE TABLE IF NOT EXISTS public.user_vaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    encrypted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    wallet_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. USER CUSTOM RPCS TABLE (Custom RPC Clusters)
CREATE TABLE IF NOT EXISTS public.user_custom_rpcs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    network_key VARCHAR(64) DEFAULT 'robinhood',
    name VARCHAR(128) NOT NULL,
    url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. USER MINT PROFILES TABLE (Saved Configurations)
CREATE TABLE IF NOT EXISTS public.user_mint_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    profile_name VARCHAR(128) NOT NULL,
    profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security (RLS) on all tables so backend & client can read/write seamlessly
ALTER TABLE public.app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_user_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vaults DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_rpcs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mint_profiles DISABLE ROW LEVEL SECURITY;

-- Insert Master VIP Invite Codes
INSERT INTO public.app_invites (invite_code, note, validity_days, max_uses)
VALUES 
  ('AERO-VIP-2026', 'Master VIP Access Key (365 Days)', 365, 500),
  ('AERO-VIP-ACCESS-2026', 'Master VIP Access Key (365 Days)', 365, 500)
ON CONFLICT (invite_code) DO NOTHING;
