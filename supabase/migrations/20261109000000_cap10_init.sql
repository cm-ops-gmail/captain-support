-- Cap10 Support — initial schema (fresh Supabase project).
-- Consolidated from the Student Support Hub migrations, trimmed to the
-- issue-reporting system, plus class segmentation and Captain Voice.
--
-- Security model: RLS is ENABLED on every table with NO policies, so the
-- anon/public key cannot read anything. All access goes through TanStack
-- server functions that use the service-role key and check the app session.

-- ---------------------------------------------------------------- helpers
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Supported class segments. Keep in sync with src/lib/class-segments.ts.
-- class_6, class_7, class_8, class_9, ssc_27, ssc_28, hsc_27, hsc_28

-- ---------------------------------------------------------------- students
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  login_number text NOT NULL,
  contact_number text NOT NULL,
  student_code text,
  email text,
  class_segment text NOT NULL,
  account_role text NOT NULL DEFAULT 'student',
  status text NOT NULL DEFAULT 'active',
  password_hash text,
  tms_transaction_ids text[] NOT NULL DEFAULT '{}',
  last_login_at timestamptz,
  deactivated_at timestamptz,
  deactivation_reason text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT students_class_segment_check CHECK (class_segment IN
    ('class_6','class_7','class_8','class_9','ssc_27','ssc_28','hsc_27','hsc_28')),
  CONSTRAINT students_account_role_check CHECK (account_role IN ('student','captain')),
  CONSTRAINT students_status_check CHECK (status IN ('active','inactive'))
);
CREATE UNIQUE INDEX students_login_number_unique_idx ON public.students (login_number);
CREATE INDEX students_segment_role_idx ON public.students (class_segment, account_role, status);
CREATE INDEX students_tms_ids_gin_idx ON public.students USING GIN (tms_transaction_ids);
CREATE TRIGGER students_updated BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
COMMENT ON COLUMN public.students.password_hash IS
  'NULL until the student completes first-time setup with login number + student code / TMS id.';
COMMENT ON COLUMN public.students.tms_transaction_ids IS
  'Optional verifiers for first-time setup. Never log these values.';

-- ---------------------------------------------------------------- tickets
CREATE SEQUENCE public.ticket_number_seq START 1;

CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE
    DEFAULT ('CAP10-' || lpad(nextval('public.ticket_number_seq')::text, 6, '0')),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  -- Copied from the student at creation time so class dashboards need no
  -- join, and history stays correct if the student later changes class.
  class_segment text NOT NULL,
  category text NOT NULL,
  sub_type text,
  platform text,
  app_version text,
  page_or_feature text,
  link text,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'Open',
  priority text NOT NULL DEFAULT 'normal',
  source_role text NOT NULL DEFAULT 'student',
  official_response text,
  handled_by text,
  resolved_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tickets_class_segment_check CHECK (class_segment IN
    ('class_6','class_7','class_8','class_9','ssc_27','ssc_28','hsc_27','hsc_28')),
  CONSTRAINT tickets_status_check CHECK (status IN ('Open','In Progress','Resolved','Closed')),
  CONSTRAINT tickets_priority_check CHECK (priority IN ('normal','high','urgent')),
  CONSTRAINT tickets_source_role_check CHECK (source_role IN ('student','captain')),
  CONSTRAINT tickets_platform_check CHECK (platform IS NULL OR platform IN
    ('android','ios','web','desktop','other'))
);
CREATE INDEX tickets_segment_status_created_idx ON public.tickets (class_segment, status, created_at DESC);
CREATE INDEX tickets_category_idx ON public.tickets (category);
CREATE INDEX tickets_student_idx ON public.tickets (student_id);
CREATE INDEX tickets_priority_status_created_idx ON public.tickets (priority, status, created_at DESC);
CREATE TRIGGER tickets_updated BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL,
  sender_name text,
  message text NOT NULL,
  internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ticket_messages_ticket_idx ON public.ticket_messages (ticket_id);

CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.ticket_messages(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  storage_path text,
  external_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attachments_ticket_idx ON public.attachments (ticket_id);

-- Tracks up to when a student has seen "your issue was resolved" toasts.
ALTER TABLE public.students ADD COLUMN resolved_notifications_seen_at timestamptz;

-- ---------------------------------------------------------------- captain voice
CREATE SEQUENCE public.captain_submission_seq START 1;

CREATE TABLE public.captain_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_number text NOT NULL UNIQUE
    DEFAULT ('VOICE-' || lpad(nextval('public.captain_submission_seq')::text, 5, '0')),
  captain_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_segment text NOT NULL,
  kind text NOT NULL,
  area text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  expected_benefit text,
  status text NOT NULL DEFAULT 'New',
  staff_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT captain_submissions_segment_check CHECK (class_segment IN
    ('class_6','class_7','class_8','class_9','ssc_27','ssc_28','hsc_27','hsc_28')),
  CONSTRAINT captain_submissions_kind_check CHECK (kind IN ('improvement','experience','proposal')),
  CONSTRAINT captain_submissions_status_check CHECK (status IN
    ('New','Under Review','Planned','Implemented','Declined'))
);
CREATE INDEX captain_submissions_segment_idx ON public.captain_submissions (class_segment, status, created_at DESC);
CREATE INDEX captain_submissions_captain_idx ON public.captain_submissions (captain_id, created_at DESC);
CREATE TRIGGER captain_submissions_updated BEFORE UPDATE ON public.captain_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------- notices
CREATE TABLE public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  priority text NOT NULL DEFAULT 'Normal',
  published boolean NOT NULL DEFAULT true,
  -- Empty array = visible to every class.
  target_segments text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER notices_updated BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------- staff / settings / audit
CREATE TABLE public.staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER staff_updated BEFORE UPDATE ON public.staff_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type text NOT NULL,
  actor_id uuid,
  actor_name text,
  event_type text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_actor_type_check CHECK (actor_type IN ('student','staff','system'))
);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_actor_idx ON public.audit_logs (actor_type, actor_id, created_at DESC);
COMMENT ON TABLE public.audit_logs IS
  'Server-created activity log. Never store passwords, TMS IDs, emails, or message content in metadata.';

-- ---------------------------------------------------------------- grants + RLS
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['students','tickets','ticket_messages','attachments',
    'captain_submissions','notices','staff_users','app_settings','audit_logs']
  LOOP
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
GRANT USAGE, SELECT ON SEQUENCE public.ticket_number_seq, public.captain_submission_seq TO service_role;

-- ---------------------------------------------------------------- storage
-- Private bucket; files are served through short-lived signed URLs only.
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------- seed
INSERT INTO public.app_settings (key, value) VALUES
  ('upload', '{"max_file_mb": 8, "max_files": 5}'::jsonb);

-- Demo accounts have no password; complete "First-time setup" with the
-- login number + student code shown here. Delete with: DELETE FROM students WHERE is_demo;
INSERT INTO public.students (name, login_number, contact_number, student_code, class_segment, account_role, is_demo) VALUES
  ('Demo Class 6 Student', '01700000006', '01700000006', 'C6-001', 'class_6', 'student', true),
  ('Demo Class 9 Student', '01700000009', '01700000009', 'C9-001', 'class_9', 'student', true),
  ('Demo SSC 27 Student',  '01700002701', '01700002701', 'S27-001', 'ssc_27', 'student', true),
  ('Demo HSC 28 Student',  '01700002801', '01700002801', 'H28-001', 'hsc_28', 'student', true),
  ('Demo HSC 28 Captain',  '01700002899', '01700002899', 'H28-CAP', 'hsc_28', 'captain', true);

INSERT INTO public.tickets (student_id, class_segment, category, sub_type, platform, title, description, status, is_demo)
SELECT s.id, s.class_segment, v.category, v.sub_type, v.platform, v.title, v.description, v.status, true
FROM (VALUES
  ('01700000006','App','Crash','android','App closes when opening a lesson','The app crashes every time I open the Math chapter 3 lesson.','Open'),
  ('01700000009','Website','Slow / Freeze','web','Website is very slow at night','Pages take more than 20 seconds to load after 9 PM.','In Progress'),
  ('01700002701','Live/Recorded Class','Video won''t play','ios','Recorded class video not playing','Physics recorded class shows a black screen on iPhone.','Open'),
  ('01700002801','Experience/Feedback','Suggestion',NULL,'Please add dark mode','Studying at night is hard on the eyes; a dark mode would help.','Resolved')
) AS v(login, category, sub_type, platform, title, description, status)
JOIN public.students s ON s.login_number = v.login;

INSERT INTO public.ticket_messages (ticket_id, sender_type, sender_name, message, created_at)
SELECT t.id, 'student', 'Student', t.description, t.created_at FROM public.tickets t;

INSERT INTO public.notices (title, content, priority, target_segments) VALUES
  ('Welcome to Cap10 Support', 'Report any App, Website, Product or experience issue here. Our team will respond as soon as possible.', 'Normal', '{}'),
  ('HSC 28: app update available', 'Please update to the latest app version from the Play Store / App Store before reporting playback issues.', 'High', '{hsc_28}');
