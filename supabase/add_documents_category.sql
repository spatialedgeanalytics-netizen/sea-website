-- Run this in Supabase SQL Editor
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS category         TEXT DEFAULT 'field',
  ADD COLUMN IF NOT EXISTS notes            TEXT,
  ADD COLUMN IF NOT EXISTS slot_type        TEXT,
  ADD COLUMN IF NOT EXISTS id_document_url  TEXT,
  ADD COLUMN IF NOT EXISTS id_document_path TEXT;
