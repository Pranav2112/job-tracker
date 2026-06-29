-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMs ────────────────────────────────────────────────────────────────────
CREATE TYPE app_type AS ENUM ('Internship', 'FullTime', 'CoOp');
CREATE TYPE remote_type AS ENUM ('Remote', 'Hybrid', 'Onsite');
CREATE TYPE pipeline_stage AS ENUM (
  'Researching','Preparing','Applied','ReferralRequested',
  'RecruiterScreen','Interviewing','OfferReceived','Negotiating',
  'Accepted','Rejected','Withdrawn','Ghosted'
);
CREATE TYPE priority_level AS ENUM ('High', 'Medium', 'Low');
CREATE TYPE doc_type AS ENUM ('Resume', 'CoverLetter', 'Portfolio', 'Transcript', 'Other');
CREATE TYPE contact_relationship AS ENUM ('Recruiter', 'Referral', 'Alum', 'HiringManager', 'Other');
CREATE TYPE interview_round_type AS ENUM ('PhoneScreen','Technical','Behavioral','CaseStudy','Onsite','Final','Other');
CREATE TYPE interview_format AS ENUM ('Phone', 'Video', 'Onsite');
CREATE TYPE interview_outcome AS ENUM ('Pending', 'Passed', 'Failed', 'Cancelled');
CREATE TYPE offer_outcome AS ENUM ('Accepted', 'Declined', 'Expired');

-- ─── TABLES ───────────────────────────────────────────────────────────────────
CREATE TABLE applications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name     TEXT NOT NULL,
  role_title       TEXT NOT NULL,
  app_type         app_type NOT NULL DEFAULT 'Internship',
  location         TEXT,
  remote_type      remote_type,
  posting_url      TEXT,
  source           TEXT,
  stage            pipeline_stage NOT NULL DEFAULT 'Researching',
  priority         priority_level NOT NULL DEFAULT 'Medium',
  salary_info      TEXT,
  notes            TEXT,
  date_discovered  DATE DEFAULT CURRENT_DATE,
  date_applied     DATE,
  deadline         DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  doc_type        doc_type NOT NULL DEFAULT 'Resume',
  file_name       TEXT NOT NULL,
  file_url        TEXT,       -- external link OR null when using storage
  storage_path    TEXT,       -- path in Supabase Storage bucket
  version_label   TEXT,
  date_used       DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  role_title      TEXT,
  relationship    contact_relationship NOT NULL DEFAULT 'Other',
  linkedin_url    TEXT,
  email           TEXT,
  notes           TEXT,
  last_contacted  DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE application_contacts (
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id)     ON DELETE CASCADE,
  PRIMARY KEY (application_id, contact_id)
);

CREATE TABLE interview_rounds (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  round_type      interview_round_type NOT NULL DEFAULT 'PhoneScreen',
  scheduled_at    TIMESTAMPTZ,
  format          interview_format NOT NULL DEFAULT 'Video',
  prep_notes      TEXT,
  post_notes      TEXT,
  outcome         interview_outcome NOT NULL DEFAULT 'Pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE interview_round_contacts (
  round_id    UUID NOT NULL REFERENCES interview_rounds(id) ON DELETE CASCADE,
  contact_id  UUID NOT NULL REFERENCES contacts(id)         ON DELETE CASCADE,
  PRIMARY KEY (round_id, contact_id)
);

CREATE TABLE research_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE offers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id  UUID UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  base_salary     NUMERIC,
  signing_bonus   NUMERIC,
  stipend         NUMERIC,
  housing         NUMERIC,
  equity          TEXT,
  other_perks     TEXT,
  offer_deadline  DATE,
  final_outcome   offer_outcome,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE negotiation_log_entries (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id  UUID NOT NULL REFERENCES offers(id)     ON DELETE CASCADE,
  content   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE activity_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TRIGGERS (auto-update updated_at) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_applications_updated_at    BEFORE UPDATE ON applications    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_contacts_updated_at        BEFORE UPDATE ON contacts        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_interview_rounds_updated_at BEFORE UPDATE ON interview_rounds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_research_notes_updated_at  BEFORE UPDATE ON research_notes  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_offers_updated_at          BEFORE UPDATE ON offers          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
ALTER TABLE applications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_contacts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_rounds        ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_round_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiation_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log            ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_applications"            ON applications            FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_documents"               ON documents               FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_contacts"                ON contacts                FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_interview_rounds"        ON interview_rounds        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_research_notes"          ON research_notes          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_offers"                  ON offers                  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_negotiation_log_entries" ON negotiation_log_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_activity_log"            ON activity_log            FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_application_contacts" ON application_contacts FOR ALL USING (
  EXISTS (SELECT 1 FROM applications WHERE id = application_id AND user_id = auth.uid())
);
CREATE POLICY "own_interview_round_contacts" ON interview_round_contacts FOR ALL USING (
  EXISTS (SELECT 1 FROM interview_rounds WHERE id = round_id AND user_id = auth.uid())
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_applications_user_stage      ON applications(user_id, stage);
CREATE INDEX idx_applications_deadline        ON applications(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX idx_documents_application_id     ON documents(application_id);
CREATE INDEX idx_interview_rounds_app_id      ON interview_rounds(application_id);
CREATE INDEX idx_interview_rounds_scheduled   ON interview_rounds(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_research_notes_app_id        ON research_notes(application_id);
CREATE INDEX idx_activity_log_app_id          ON activity_log(application_id);
CREATE INDEX idx_contacts_user_id             ON contacts(user_id);

-- ─── STORAGE BUCKET (run via Supabase dashboard or CLI) ───────────────────────
-- Insert this in the Supabase SQL editor:
-- SELECT storage.foldername(name) FROM storage.objects LIMIT 1; -- (just to test storage is available)
-- Then create bucket via dashboard: Storage > New Bucket > Name: "documents", Public: false
