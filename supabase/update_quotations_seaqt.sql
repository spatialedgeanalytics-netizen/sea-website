-- Run this in Supabase SQL Editor
-- Quotations: SEAQT reference numbering + the fields used by the quotation layout
-- (same layout as quotation_generator.py)

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS quote_no     INTEGER UNIQUE,                 -- 1, 2, 3 ... never reused
  ADD COLUMN IF NOT EXISTS farm_name    TEXT,
  ADD COLUMN IF NOT EXISTS date_issued  TEXT,                           -- as printed, e.g. "23 October 2026"
  ADD COLUMN IF NOT EXISTS tax_total    DECIMAL(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deliverables JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS terms        JSONB DEFAULT '[]'::jsonb;

-- Single-row counter. It is bumped inside the same transaction as the insert, so two admins
-- saving at once can never get the same number, and a failed save does not use one up.
CREATE TABLE IF NOT EXISTS public.quotation_counter (
  id      INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_no INTEGER NOT NULL DEFAULT 0
);
INSERT INTO public.quotation_counter (id, last_no) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.quotation_counter ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read quotation counter" ON public.quotation_counter;
CREATE POLICY "Admins read quotation counter" ON public.quotation_counter FOR SELECT USING (public.is_admin());

-- Reference = SEAQT + yyyymmdd + number (at least 2 digits): SEAQT2026102301, SEAQT2026102302 ...
CREATE OR REPLACE FUNCTION public.assign_quotation_ref()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INTEGER;
BEGIN
  UPDATE public.quotation_counter SET last_no = last_no + 1 WHERE id = 1 RETURNING last_no INTO n;
  NEW.quote_no := n;
  NEW.quotation_ref := 'SEAQT'
    || to_char(NOW() AT TIME ZONE 'Africa/Harare', 'YYYYMMDD')
    || lpad(n::text, greatest(2, length(n::text)), '0');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assign_quotation_ref ON public.quotations;
CREATE TRIGGER trg_assign_quotation_ref BEFORE INSERT ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.assign_quotation_ref();

-- The number and reference can't be changed once issued
CREATE OR REPLACE FUNCTION public.lock_quotation_ref()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.quote_no := OLD.quote_no;
  NEW.quotation_ref := OLD.quotation_ref;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_lock_quotation_ref ON public.quotations;
CREATE TRIGGER trg_lock_quotation_ref BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.lock_quotation_ref();
