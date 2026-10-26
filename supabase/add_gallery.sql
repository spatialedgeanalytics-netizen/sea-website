-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.gallery (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT,
  category    TEXT NOT NULL,
  image_url   TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.admin_profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- Public site can read all gallery images
CREATE POLICY "Public can view gallery"
  ON public.gallery FOR SELECT USING (true);

-- Only admins can insert / delete
CREATE POLICY "Admins manage gallery"
  ON public.gallery FOR ALL USING (public.is_admin());
