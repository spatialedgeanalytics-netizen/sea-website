-- ============================================================
-- SYSTEM AUDIT TRAIL (SAT)
-- Run this ONCE in Supabase SQL Editor, after all other scripts.
--
-- What it does:
--   1. audit_log          — append-only record of every insert / edit / delete
--   2. Triggers           — attached to every business table; logging happens
--                           inside the database, so the website cannot skip it
--   3. Tamper protection  — no one (admins, anon, even service_role) can
--                           UPDATE / DELETE / TRUNCATE audit rows; each row is
--                           SHA-256 hash-chained to the previous one so any
--                           out-of-band edit is detectable via sat_verify_chain()
--   4. Restore workflow   — an admin requests a restore of a deleted / edited
--                           record; it executes only when EVERY admin approves
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id              BIGSERIAL PRIMARY KEY,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  actor_id        UUID,                 -- auth.uid(); NULL = public visitor / system
  actor_name      TEXT,                 -- snapshot, survives profile edits
  actor_code      TEXT,
  action          TEXT NOT NULL,        -- INSERT | UPDATE | DELETE | RESTORE | LOGIN | LOGOUT | ...
  table_name      TEXT,
  record_id       TEXT,
  old_data        JSONB,
  new_data        JSONB,
  changed_fields  TEXT[],
  ip_address      TEXT,                 -- taken from request headers server-side
  user_agent      TEXT,
  client_location TEXT,                 -- "lat,lon,accuracy_m" reported by the browser (if allowed)
  note            TEXT,
  prev_hash       TEXT,
  row_hash        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_log_occurred_idx ON public.audit_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_table_idx    ON public.audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx    ON public.audit_log (actor_id);

-- Latest browser-reported location per admin (used to stamp their audit rows)
CREATE TABLE IF NOT EXISTS public.sat_admin_locations (
  admin_id     UUID PRIMARY KEY REFERENCES public.admin_profiles(id),
  location     TEXT NOT NULL,
  reported_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_restore_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id  BIGINT NOT NULL REFERENCES public.audit_log(id),
  requested_by  UUID NOT NULL REFERENCES public.admin_profiles(id),
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING','EXECUTED','REJECTED','FAILED')),
  result_note   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

-- Only one open / successful request per audit entry
CREATE UNIQUE INDEX IF NOT EXISTS audit_restore_one_active
  ON public.audit_restore_requests (audit_log_id)
  WHERE status IN ('PENDING','EXECUTED');

CREATE TABLE IF NOT EXISTS public.audit_restore_votes (
  request_id  UUID NOT NULL REFERENCES public.audit_restore_requests(id),
  admin_id    UUID NOT NULL REFERENCES public.admin_profiles(id),
  approve     BOOLEAN NOT NULL,
  comment     TEXT,
  voted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (request_id, admin_id)
);

-- ------------------------------------------------------------
-- 2. Permissions — read-only for admins, no direct writes for anyone
-- ------------------------------------------------------------
ALTER TABLE public.audit_log              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_restore_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_restore_votes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sat_admin_locations    ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.audit_log, public.audit_restore_requests, public.audit_restore_votes,
              public.sat_admin_locations
  FROM anon, authenticated, service_role;
GRANT SELECT ON public.audit_log, public.audit_restore_requests, public.audit_restore_votes
  TO authenticated;
REVOKE ALL ON SEQUENCE public.audit_log_id_seq FROM anon, authenticated, service_role;

DROP POLICY IF EXISTS "Admins read audit log"       ON public.audit_log;
DROP POLICY IF EXISTS "Admins read restore requests" ON public.audit_restore_requests;
DROP POLICY IF EXISTS "Admins read restore votes"    ON public.audit_restore_votes;
CREATE POLICY "Admins read audit log"        ON public.audit_log              FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins read restore requests" ON public.audit_restore_requests FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins read restore votes"    ON public.audit_restore_votes    FOR SELECT USING (public.is_admin());

-- ------------------------------------------------------------
-- 3. Immutability guard — blocks UPDATE / DELETE / TRUNCATE for every role
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sat_block_modification()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'System Audit Trail is append-only: % on % is not permitted', TG_OP, TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS sat_guard_rows ON public.audit_log;
CREATE TRIGGER sat_guard_rows BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.sat_block_modification();
DROP TRIGGER IF EXISTS sat_guard_truncate ON public.audit_log;
CREATE TRIGGER sat_guard_truncate BEFORE TRUNCATE ON public.audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION public.sat_block_modification();

DROP TRIGGER IF EXISTS sat_guard_votes ON public.audit_restore_votes;
CREATE TRIGGER sat_guard_votes BEFORE UPDATE OR DELETE ON public.audit_restore_votes
  FOR EACH ROW EXECUTE FUNCTION public.sat_block_modification();
DROP TRIGGER IF EXISTS sat_guard_votes_truncate ON public.audit_restore_votes;
CREATE TRIGGER sat_guard_votes_truncate BEFORE TRUNCATE ON public.audit_restore_votes
  FOR EACH STATEMENT EXECUTE FUNCTION public.sat_block_modification();

-- Restore requests may only move PENDING -> resolved, never be deleted or rewritten
CREATE OR REPLACE FUNCTION public.sat_guard_request()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD.status <> 'PENDING'
     OR NEW.audit_log_id <> OLD.audit_log_id OR NEW.requested_by <> OLD.requested_by
     OR NEW.reason <> OLD.reason OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Restore requests cannot be altered or deleted';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sat_guard_requests ON public.audit_restore_requests;
CREATE TRIGGER sat_guard_requests BEFORE UPDATE OR DELETE ON public.audit_restore_requests
  FOR EACH ROW EXECUTE FUNCTION public.sat_guard_request();
DROP TRIGGER IF EXISTS sat_guard_requests_truncate ON public.audit_restore_requests;
CREATE TRIGGER sat_guard_requests_truncate BEFORE TRUNCATE ON public.audit_restore_requests
  FOR EACH STATEMENT EXECUTE FUNCTION public.sat_block_modification();

-- ------------------------------------------------------------
-- 4. Core writer — the ONLY way rows enter audit_log
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sat_hash(r public.audit_log)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(sha256(convert_to(
    concat_ws('|',
      coalesce(r.prev_hash, 'GENESIS'), r.id, extract(epoch FROM r.occurred_at), r.actor_id, r.action,
      r.table_name, r.record_id, r.old_data::text, r.new_data::text,
      r.ip_address, r.client_location, r.note),
    'UTF8')), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.sat_write(
  p_action TEXT, p_table TEXT, p_record_id TEXT,
  p_old JSONB, p_new JSONB, p_changed TEXT[], p_note TEXT
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  hdrs     JSON;
  r        public.audit_log;
  v_uid    UUID := auth.uid();
BEGIN
  -- Serialise writers so the hash chain has a single, ordered tail
  PERFORM pg_advisory_xact_lock(hashtext('sea_system_audit_trail'));

  BEGIN
    hdrs := nullif(current_setting('request.headers', true), '')::json;
  EXCEPTION WHEN others THEN hdrs := NULL;
  END;

  r.id          := nextval('public.audit_log_id_seq');
  r.occurred_at := clock_timestamp();
  r.actor_id    := v_uid;
  r.action      := p_action;
  r.table_name  := p_table;
  r.record_id   := p_record_id;
  r.old_data    := p_old;
  r.new_data    := p_new;
  r.changed_fields := p_changed;
  r.note        := p_note;
  r.ip_address  := coalesce(hdrs ->> 'cf-connecting-ip',
                            trim(split_part(hdrs ->> 'x-forwarded-for', ',', 1)),
                            hdrs ->> 'x-real-ip');
  r.user_agent  := left(hdrs ->> 'user-agent', 300);

  IF v_uid IS NOT NULL THEN
    SELECT full_name, admin_code INTO r.actor_name, r.actor_code
      FROM public.admin_profiles WHERE id = v_uid;
    SELECT location INTO r.client_location
      FROM public.sat_admin_locations
     WHERE admin_id = v_uid AND reported_at > NOW() - INTERVAL '12 hours';
  END IF;

  SELECT row_hash INTO r.prev_hash FROM public.audit_log ORDER BY id DESC LIMIT 1;
  r.row_hash := public.sat_hash(r);

  INSERT INTO public.audit_log VALUES (r.*);
  RETURN r.id;
END;
$$;

REVOKE ALL ON FUNCTION public.sat_write(TEXT,TEXT,TEXT,JSONB,JSONB,TEXT[],TEXT) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 5. Generic row-change trigger
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sat_capture()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old     JSONB;
  v_new     JSONB;
  v_changed TEXT[];
  v_action  TEXT := TG_OP;
  v_note    TEXT := nullif(current_setting('sat.restore_note', true), '');
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN v_old := to_jsonb(OLD); END IF;
  IF TG_OP IN ('UPDATE','INSERT') THEN v_new := to_jsonb(NEW); END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(k ORDER BY k) INTO v_changed
      FROM jsonb_object_keys(v_new) k
     WHERE v_new -> k IS DISTINCT FROM v_old -> k;
    IF v_changed IS NULL THEN RETURN NULL; END IF;   -- no real change

    -- Presence heartbeat on admin_profiles is noise, not an alteration
    IF TG_TABLE_NAME = 'admin_profiles' AND v_changed <@ ARRAY['is_online','last_seen'] THEN
      RETURN NULL;
    END IF;
  END IF;

  IF v_note IS NOT NULL THEN v_action := 'RESTORE'; END IF;

  PERFORM public.sat_write(
    v_action, TG_TABLE_NAME,
    coalesce(v_new ->> 'id', v_old ->> 'id'),
    v_old, v_new, v_changed, v_note);
  RETURN NULL;
END;
$$;

-- Attach to every business table that exists
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'admin_profiles','ledger_entries','deductions','inventory','quotations',
    'documents','gallery','chat_messages','tasks','task_comments',
    'leave_requests','job_vacancies','job_applications','contact_enquiries'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS sat_audit ON public.%I', t);
      EXECUTE format('CREATE TRIGGER sat_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I
                      FOR EACH ROW EXECUTE FUNCTION public.sat_capture()', t);
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 6. Session events (login / logout) — actor is always the caller
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sat_log_event(p_action TEXT, p_note TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF p_action NOT IN ('LOGIN','LOGOUT') THEN RAISE EXCEPTION 'Unsupported event'; END IF;
  PERFORM public.sat_write(p_action, NULL, NULL, NULL, NULL, NULL, left(p_note, 200));
END;
$$;
GRANT EXECUTE ON FUNCTION public.sat_log_event(TEXT, TEXT) TO authenticated;

-- Browser reports its GPS position (only if the admin allows location access)
CREATE OR REPLACE FUNCTION public.sat_report_location(p_lat NUMERIC, p_lon NUMERIC, p_accuracy NUMERIC)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF p_lat NOT BETWEEN -90 AND 90 OR p_lon NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'Invalid coordinates';
  END IF;
  INSERT INTO public.sat_admin_locations (admin_id, location, reported_at)
  VALUES (auth.uid(), format('%s,%s,%s', round(p_lat, 5), round(p_lon, 5), round(coalesce(p_accuracy, 0))), NOW())
  ON CONFLICT (admin_id) DO UPDATE SET location = EXCLUDED.location, reported_at = EXCLUDED.reported_at;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sat_report_location(NUMERIC, NUMERIC, NUMERIC) TO authenticated;

-- ------------------------------------------------------------
-- 7. Restore workflow
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sat_execute_restore(p_request UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  req   public.audit_restore_requests;
  ent   public.audit_log;
  cols  TEXT;
BEGIN
  SELECT * INTO req FROM public.audit_restore_requests WHERE id = p_request;
  SELECT * INTO ent FROM public.audit_log WHERE id = req.audit_log_id;

  -- Tag the resulting audit rows as RESTORE with a reference to the request
  PERFORM set_config('sat.restore_note',
    format('Restore of audit #%s (request %s) approved by all admins', ent.id, req.id), true);

  SELECT string_agg(format('%I', c.column_name), ',' ORDER BY c.ordinal_position) INTO cols
    FROM information_schema.columns c
   WHERE c.table_schema = 'public' AND c.table_name = ent.table_name
     AND ent.old_data ? c.column_name;

  IF ent.action = 'DELETE' THEN
    EXECUTE format(
      'INSERT INTO public.%1$I (%2$s) SELECT %2$s FROM jsonb_populate_record(NULL::public.%1$I, $1)',
      ent.table_name, cols) USING ent.old_data;
  ELSE  -- UPDATE: put every column back to its previous value
    EXECUTE format(
      'UPDATE public.%1$I SET (%2$s) = (SELECT %2$s FROM jsonb_populate_record(NULL::public.%1$I, $1)) WHERE id::text = $2',
      ent.table_name, cols) USING ent.old_data, ent.record_id;
  END IF;

  PERFORM set_config('sat.restore_note', '', true);

  UPDATE public.audit_restore_requests
     SET status = 'EXECUTED', resolved_at = NOW(), result_note = 'Record restored'
   WHERE id = p_request;
END;
$$;
REVOKE ALL ON FUNCTION public.sat_execute_restore(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sat_request_restore(p_audit_id BIGINT, p_reason TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ent    public.audit_log;
  v_req  UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;

  SELECT * INTO ent FROM public.audit_log WHERE id = p_audit_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Audit entry not found'; END IF;
  IF ent.action NOT IN ('DELETE','UPDATE') OR ent.old_data IS NULL THEN
    RAISE EXCEPTION 'Only deletions and edits can be restored';
  END IF;
  IF ent.table_name IN ('admin_profiles','chat_messages') THEN
    RAISE EXCEPTION 'Records in % cannot be restored through the audit trail', ent.table_name;
  END IF;

  INSERT INTO public.audit_restore_requests (audit_log_id, requested_by, reason)
  VALUES (p_audit_id, auth.uid(), trim(p_reason))
  RETURNING id INTO v_req;

  -- The requester's own approval is implied
  INSERT INTO public.audit_restore_votes (request_id, admin_id, approve, comment)
  VALUES (v_req, auth.uid(), TRUE, 'Requester');

  PERFORM public.sat_write('RESTORE_REQUESTED', ent.table_name, ent.record_id, NULL, NULL, NULL,
    format('Request %s for audit #%s: %s', v_req, ent.id, trim(p_reason)));

  -- Single-admin edge case
  IF (SELECT count(*) FROM public.admin_profiles) <= 1 THEN
    PERFORM public.sat_execute_restore(v_req);
  END IF;
  RETURN v_req;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sat_request_restore(BIGINT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.sat_vote_restore(p_request UUID, p_approve BOOLEAN, p_comment TEXT DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  req        public.audit_restore_requests;
  ent        public.audit_log;
  n_admins   INT;
  n_approve  INT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised'; END IF;

  SELECT * INTO req FROM public.audit_restore_requests WHERE id = p_request FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF req.status <> 'PENDING' THEN RAISE EXCEPTION 'Request is already %', req.status; END IF;
  SELECT * INTO ent FROM public.audit_log WHERE id = req.audit_log_id;

  INSERT INTO public.audit_restore_votes (request_id, admin_id, approve, comment)
  VALUES (p_request, auth.uid(), p_approve, left(p_comment, 500));   -- PK blocks double voting

  PERFORM public.sat_write(CASE WHEN p_approve THEN 'RESTORE_APPROVED' ELSE 'RESTORE_REJECTED' END,
    ent.table_name, ent.record_id, NULL, NULL, NULL,
    format('Request %s%s', p_request, CASE WHEN p_comment <> '' THEN ': ' || p_comment ELSE '' END));

  IF NOT p_approve THEN
    UPDATE public.audit_restore_requests
       SET status = 'REJECTED', resolved_at = NOW(), result_note = 'Rejected by an admin'
     WHERE id = p_request;
    RETURN 'REJECTED';
  END IF;

  SELECT count(*) INTO n_admins FROM public.admin_profiles;
  SELECT count(*) INTO n_approve
    FROM public.audit_restore_votes v JOIN public.admin_profiles a ON a.id = v.admin_id
   WHERE v.request_id = p_request AND v.approve;

  IF n_approve < n_admins THEN RETURN 'PENDING'; END IF;

  BEGIN
    PERFORM public.sat_execute_restore(p_request);
    RETURN 'EXECUTED';
  EXCEPTION WHEN others THEN
    UPDATE public.audit_restore_requests
       SET status = 'FAILED', resolved_at = NOW(), result_note = left(SQLERRM, 500)
     WHERE id = p_request;
    RETURN 'FAILED: ' || SQLERRM;
  END;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sat_vote_restore(UUID, BOOLEAN, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 8. Integrity check — recomputes the whole hash chain
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sat_verify_chain()
RETURNS TABLE (ok BOOLEAN, total_rows BIGINT, first_bad_id BIGINT, detail TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r      public.audit_log;
  prev   TEXT := NULL;
  n      BIGINT := 0;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised'; END IF;
  FOR r IN SELECT * FROM public.audit_log ORDER BY id LOOP
    n := n + 1;
    IF r.prev_hash IS DISTINCT FROM prev THEN
      RETURN QUERY SELECT FALSE, n, r.id, 'Chain broken: a row before this one was removed or altered'::text;
      RETURN;
    END IF;
    IF r.row_hash <> public.sat_hash(r) THEN
      RETURN QUERY SELECT FALSE, n, r.id, 'Row contents do not match their hash: this row was altered'::text;
      RETURN;
    END IF;
    prev := r.row_hash;
  END LOOP;
  RETURN QUERY SELECT TRUE, n, NULL::BIGINT, 'All rows intact'::text;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sat_verify_chain() TO authenticated;

-- ------------------------------------------------------------
-- 9. Storage — keep files so deleted documents can be restored
-- ------------------------------------------------------------
-- The website no longer deletes files from the sea-documents bucket.
-- To stop anyone deleting them through the API as well, go to
-- Dashboard > Storage > Policies > sea-documents and delete any DELETE policy.
-- (List them with:  SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'storage';)

-- ------------------------------------------------------------
-- 10. Realtime (optional) — so the SAT page updates live
-- ------------------------------------------------------------
-- Dashboard > Database > Replication: enable audit_log, audit_restore_requests, audit_restore_votes
