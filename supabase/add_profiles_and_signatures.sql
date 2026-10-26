-- Run this in Supabase SQL Editor

-- Add extra columns to admin_profiles
ALTER TABLE public.admin_profiles
  ADD COLUMN IF NOT EXISTS role_title      TEXT,
  ADD COLUMN IF NOT EXISTS phone           TEXT,
  ADD COLUMN IF NOT EXISTS dob             DATE,
  ADD COLUMN IF NOT EXISTS avatar_url      TEXT,
  ADD COLUMN IF NOT EXISTS signature_url   TEXT,
  ADD COLUMN IF NOT EXISTS id_document_url TEXT;

-- Set company roles (update admin_codes to match what you inserted)
UPDATE public.admin_profiles SET role_title = 'Chairperson'      WHERE admin_code = 'SEA-A01';
UPDATE public.admin_profiles SET role_title = 'Treasurer'         WHERE admin_code = 'SEA-A02';
UPDATE public.admin_profiles SET role_title = 'Secretary'         WHERE admin_code = 'SEA-A03';
UPDATE public.admin_profiles SET role_title = 'Vice Chairperson'  WHERE admin_code = 'SEA-A04';

-- Add signature tracking to quotations
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS signed_by   UUID REFERENCES public.admin_profiles(id),
  ADD COLUMN IF NOT EXISTS signer_role TEXT;
