-- ============================================================
-- SPATIAL EDGE ANALYTICS (SEA) — Supabase Database Schema
-- Run this in your Supabase SQL editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Admin Profiles (linked to Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  admin_code    TEXT UNIQUE NOT NULL,   -- e.g. SEA-A01
  role          TEXT DEFAULT 'admin',
  is_online     BOOLEAN DEFAULT FALSE,
  last_seen     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Accounts Ledger
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE NOT NULL,
  description     TEXT NOT NULL,
  amount          DECIMAL(14,2) NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('income','expense')),
  category        TEXT,
  notes           TEXT,
  entered_by      UUID REFERENCES public.admin_profiles(id),
  confirmed_by    UUID REFERENCES public.admin_profiles(id),
  is_confirmed    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Inventory
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventory (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sea_id                TEXT UNIQUE NOT NULL,   -- SEA01, SEA02 …
  item_name             TEXT NOT NULL,
  serial_number         TEXT,
  value                 DECIMAL(14,2) DEFAULT 0,
  purchase_date         DATE,
  location              TEXT,
  condition             TEXT DEFAULT 'Good',
  notes                 TEXT,
  purchased_by          UUID REFERENCES public.admin_profiles(id),
  confirmed_by          UUID REFERENCES public.admin_profiles(id),
  is_confirmed          BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Quotations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quotations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_ref   TEXT UNIQUE NOT NULL,          -- SEA/QT/20260722/001
  client_name     TEXT NOT NULL,
  client_phone    TEXT,
  client_email    TEXT,
  farm_location   TEXT,
  farm_size       TEXT,
  description     TEXT,
  services        JSONB,                          -- line items array
  transport_data  JSONB,
  soil_data       JSONB,
  pkg_total       DECIMAL(14,2) DEFAULT 0,
  transport_total DECIMAL(14,2) DEFAULT 0,
  soil_total      DECIMAL(14,2) DEFAULT 0,
  grand_total     DECIMAL(14,2) DEFAULT 0,
  created_by      UUID REFERENCES public.admin_profiles(id),
  status          TEXT DEFAULT 'draft',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name     TEXT,
  client_phone    TEXT,
  client_email    TEXT,
  work_id         TEXT,                          -- SEAW7
  document_type   TEXT,                          -- field_doc, office_doc …
  document_name   TEXT NOT NULL,
  file_url        TEXT,
  file_path       TEXT,
  uploaded_by     UUID REFERENCES public.admin_profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Chat Messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID REFERENCES public.admin_profiles(id),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  description         TEXT,
  definition_of_done  TEXT,
  assigned_to         UUID REFERENCES public.admin_profiles(id),
  assigned_by         UUID REFERENCES public.admin_profiles(id),
  deadline            TIMESTAMPTZ,
  status              TEXT DEFAULT 'TO DO' CHECK (status IN ('TO DO','IN PROGRESS','DONE')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Task Comments / Attachments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.admin_profiles(id),
  comment         TEXT,
  attachment_url  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Leave Requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID REFERENCES public.admin_profiles(id),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  reason          TEXT,
  status          TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  approved_by     UUID REFERENCES public.admin_profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Job Vacancies (public read, admin write)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.job_vacancies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  department  TEXT,
  description TEXT,
  requirements TEXT,
  deadline    DATE,
  is_active   BOOLEAN DEFAULT TRUE,
  posted_by   UUID REFERENCES public.admin_profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Job Applications (from public users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.job_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id      UUID REFERENCES public.job_vacancies(id),
  vacancy_title   TEXT,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  coverletter     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Contact Enquiries (from public website)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contact_enquiries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  subject     TEXT,
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.admin_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_vacancies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_enquiries  ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()
  );
$$;

-- admin_profiles: admins can read all; each can update own record
CREATE POLICY "Admins read all profiles"   ON public.admin_profiles FOR SELECT  USING (public.is_admin());
CREATE POLICY "Admins update own profile"  ON public.admin_profiles FOR UPDATE  USING (id = auth.uid());

-- ledger: admins only
CREATE POLICY "Admins manage ledger"   ON public.ledger_entries   FOR ALL  USING (public.is_admin());

-- inventory: admins only
CREATE POLICY "Admins manage inventory" ON public.inventory        FOR ALL  USING (public.is_admin());

-- quotations: admins only
CREATE POLICY "Admins manage quotations" ON public.quotations      FOR ALL  USING (public.is_admin());

-- documents: admins only
CREATE POLICY "Admins manage documents" ON public.documents        FOR ALL  USING (public.is_admin());

-- chat: admins only
CREATE POLICY "Admins manage chat"    ON public.chat_messages      FOR ALL  USING (public.is_admin());

-- tasks: admins only
CREATE POLICY "Admins manage tasks"   ON public.tasks              FOR ALL  USING (public.is_admin());
CREATE POLICY "Admins manage task comments" ON public.task_comments FOR ALL USING (public.is_admin());

-- leave: admins only
CREATE POLICY "Admins manage leave"   ON public.leave_requests     FOR ALL  USING (public.is_admin());

-- job vacancies: public can read active ones; admins can manage all
CREATE POLICY "Public read active vacancies" ON public.job_vacancies FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage vacancies"      ON public.job_vacancies FOR ALL    USING (public.is_admin());

-- job applications: public can insert; admins can read all
CREATE POLICY "Public insert applications"  ON public.job_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read applications"    ON public.job_applications FOR SELECT USING (public.is_admin());

-- contact enquiries: public can insert; admins read
CREATE POLICY "Public insert enquiries"     ON public.contact_enquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read enquiries"       ON public.contact_enquiries FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins update enquiries"     ON public.contact_enquiries FOR UPDATE USING (public.is_admin());

-- ============================================================
-- REALTIME (enable for chat and online status)
-- ============================================================
-- In Supabase Dashboard > Database > Replication, enable these tables:
-- chat_messages, admin_profiles

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
-- In Supabase Dashboard > Storage, create a bucket named: sea-documents
-- Set it to private. Admins will get signed URLs.

-- ============================================================
-- HOW TO CREATE ADMINS
-- ============================================================
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add user" and enter their email + password
-- 3. Copy their User UUID
-- 4. Run this SQL (replace values):
--
-- INSERT INTO public.admin_profiles (id, full_name, admin_code)
-- VALUES
--   ('UUID-OF-USER-1', 'Denzel Mashiri',    'SEA-A01'),
--   ('UUID-OF-USER-2', 'Team Member 2',     'SEA-A02'),
--   ('UUID-OF-USER-3', 'Team Member 3',     'SEA-A03'),
--   ('UUID-OF-USER-4', 'Team Member 4',     'SEA-A04');
