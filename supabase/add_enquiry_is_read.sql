-- Run this in Supabase SQL Editor
ALTER TABLE public.contact_enquiries ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
