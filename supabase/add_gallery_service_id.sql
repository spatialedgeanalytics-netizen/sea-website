-- Run this in Supabase SQL Editor
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS service_id INTEGER;
