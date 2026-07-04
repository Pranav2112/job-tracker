-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003: Profiles, Security Hardening, application_url
-- Run this in Supabase SQL Editor after 001 and 002
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── PROFILES TABLE ──────────────────────────────────────────────────────────
-- One row per auth user. Auto-populated by trigger on signup.
-- Stores all user-facing identity data, separate from auth.users.
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT,
  display_name    TEXT,
  bio             TEXT,
  location        TEXT,
  avatar_url      TEXT,
  website_url     TEXT,
  phone           TEXT,
  -- which OAuth providers are connected (populated by trigger)
  provider        TEXT DEFAULT 'email',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS — users own their own profile row
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: own row only
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- UPDATE: own row only, cannot change id
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No INSERT policy — the trigger below is SECURITY DEFINER and inserts directly.
-- This prevents users from manually inserting arbitrary profile rows.

-- auto-update updated_at
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── AUTO-CREATE PROFILE ON SIGNUP ──────────────────────────────────────────
-- Fires immediately after a new row is inserted into auth.users.
-- Works for both email/password signup AND Google OAuth.
-- SECURITY DEFINER: runs as the function owner (superuser), so it can
-- bypass RLS to insert the first profile row.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    display_name,
    avatar_url,
    provider
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(
      NEW.raw_user_meta_data->>'user_name',
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      ''
    ),
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  )
  ON CONFLICT (id) DO NOTHING; -- safe if somehow called twice
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger to avoid duplicates on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── BACKFILL: create profiles for existing users ────────────────────────────
-- Safe to run even if profiles already exist (ON CONFLICT DO NOTHING).
INSERT INTO public.profiles (id, display_name, provider)
SELECT
  id,
  split_part(email, '@', 1),
  COALESCE(raw_app_meta_data->>'provider', 'email')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ─── APPLICATION URL FIELD ───────────────────────────────────────────────────
-- Stores the actual company portal / application link (separate from posting_url)
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS application_url TEXT;

-- Index for non-null values only (partial index — efficient)
CREATE INDEX IF NOT EXISTS idx_applications_application_url
  ON public.applications(application_url)
  WHERE application_url IS NOT NULL;

-- ─── STORAGE: avatars bucket ─────────────────────────────────────────────────
-- Separate bucket from documents. Public read is intentional for avatars
-- (so img src works without signed URLs), but write is owner-only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,           -- public read so <img src> works directly
  2097152,        -- 2 MB max avatar size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Avatar storage policies — scoped to user's own folder (avatars/<user_id>/*)
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── STORAGE: documents bucket hardening ─────────────────────────────────────
-- Ensure the documents bucket is private and has a file size limit.
-- Files are stored under documents/<user_id>/<application_id>/<filename>
UPDATE storage.buckets
SET
  public           = false,
  file_size_limit  = 10485760,  -- 10 MB
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'text/plain'
  ]
WHERE id = 'documents';

-- Drop any overly-permissive document storage policies and replace with scoped ones
DROP POLICY IF EXISTS "Allow authenticated uploads"  ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated downloads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes"  ON storage.objects;
DROP POLICY IF EXISTS "documents_all"                ON storage.objects;

CREATE POLICY "documents_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "documents_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "documents_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "documents_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── RLS HARDENING: split FOR ALL into explicit per-operation policies ────────
-- FOR ALL with only USING is fine for security, but explicit policies are
-- easier to audit and reason about. We add WITH CHECK to all write operations.

-- user_gamification (from migration 002)
DROP POLICY IF EXISTS "users_own_gamification" ON public.user_gamification;

CREATE POLICY "gamification_select_own" ON public.user_gamification
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "gamification_insert_own" ON public.user_gamification
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gamification_update_own" ON public.user_gamification
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gamification_delete_own" ON public.user_gamification
  FOR DELETE USING (auth.uid() = user_id);

-- ─── INDEXES: profiles ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);
