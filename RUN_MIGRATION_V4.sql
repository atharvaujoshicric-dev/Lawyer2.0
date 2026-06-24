-- ═══════════════════════════════════════════════════════════════
--  LexDesk Migration V4
--  Run this ONCE in Supabase → SQL Editor → New Query → Run
--  SAFE TO RE-RUN (uses IF NOT EXISTS / DO NOTHING / upsert)
-- ═══════════════════════════════════════════════════════════════

-- 1. Add new columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_founder   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS archived      BOOLEAN NOT NULL DEFAULT false;
-- Expand role to 4-tier hierarchy (keep 'admin' as alias for senior_advocate for backwards compat)
-- We use text so any value is valid; app enforces the set

-- 2. Mark first user as founder + senior_advocate
UPDATE profiles
SET role = 'senior_advocate', approved = true, is_founder = true
WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1)
  AND (role = 'admin' OR is_founder = false);

-- 3. Migrate old role values
UPDATE profiles SET role = 'senior_advocate' WHERE role = 'admin';
UPDATE profiles SET role = 'junior_assistant' WHERE role = 'assistant' OR role = 'pending';

-- 4. hierarchy_permissions table
CREATE TABLE IF NOT EXISTS hierarchy_permissions (
  role        TEXT NOT NULL,
  perm_key    TEXT NOT NULL,
  allowed     BOOLEAN NOT NULL DEFAULT false,
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role, perm_key)
);

ALTER TABLE hierarchy_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All approved users read perms"  ON hierarchy_permissions;
DROP POLICY IF EXISTS "Senior advocate manages perms"  ON hierarchy_permissions;

CREATE POLICY "All approved users read perms"
  ON hierarchy_permissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND approved = true));

CREATE POLICY "Senior advocate manages perms"
  ON hierarchy_permissions FOR ALL
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'senior_advocate' AND approved = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'senior_advocate' AND approved = true));

-- 5. Seed default permissions
INSERT INTO hierarchy_permissions (role, perm_key, allowed) VALUES
  ('junior_advocate','see_finances',       false),
  ('junior_advocate','see_all_clients',    true),
  ('junior_advocate','manage_clients',     true),
  ('junior_advocate','upload_documents',   true),
  ('junior_advocate','use_templates',      true),
  ('junior_advocate','create_tasks',       true),
  ('junior_advocate','view_activity_log',  false),
  ('junior_advocate','access_chat',        true),
  ('junior_advocate','access_planner',     true),
  ('junior_advocate','access_notes',       true),
  ('senior_assistant','see_finances',      false),
  ('senior_assistant','see_all_clients',   false),
  ('senior_assistant','manage_clients',    false),
  ('senior_assistant','upload_documents',  true),
  ('senior_assistant','use_templates',     true),
  ('senior_assistant','create_tasks',      false),
  ('senior_assistant','view_activity_log', false),
  ('senior_assistant','access_chat',       true),
  ('senior_assistant','access_planner',    true),
  ('senior_assistant','access_notes',      true),
  ('junior_assistant','see_finances',      false),
  ('junior_assistant','see_all_clients',   false),
  ('junior_assistant','manage_clients',    false),
  ('junior_assistant','upload_documents',  false),
  ('junior_assistant','use_templates',     false),
  ('junior_assistant','create_tasks',      false),
  ('junior_assistant','view_activity_log', false),
  ('junior_assistant','access_chat',       true),
  ('junior_assistant','access_planner',    true),
  ('junior_assistant','access_notes',      true)
ON CONFLICT (role, perm_key) DO NOTHING;

-- 6. chatbot_settings table (optional, for enable/disable per firm)
CREATE TABLE IF NOT EXISTS chatbot_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled     BOOLEAN NOT NULL DEFAULT true,
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chatbot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users read chatbot settings"
  ON chatbot_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND approved = true));

CREATE POLICY "Senior advocate manages chatbot"
  ON chatbot_settings FOR ALL
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'senior_advocate' AND approved = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'senior_advocate' AND approved = true));

INSERT INTO chatbot_settings (enabled) VALUES (true) ON CONFLICT DO NOTHING;

-- 7. Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON hierarchy_permissions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chatbot_settings TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════
-- DONE. Refresh your app after running this.
-- ═══════════════════════════════════════════════════════════════
