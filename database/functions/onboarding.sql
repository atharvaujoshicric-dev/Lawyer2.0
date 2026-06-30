-- ════════════════════════════════════════════════════════════════════════
--  LexDesk SaaS — database/functions/onboarding.sql
--  Security-definer RPCs that are the ONLY way a firm gets created or a
--  user gets attached to one. The client app calls these via
--  supabase.rpc('create_firm_and_admin', {...}) — never inserts into
--  firms or profiles directly.
--
--  Run AFTER all four migrations in database/migrations/.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. New firm signup (the founding admin signs up for the first time) ──
-- Called immediately after supabase.auth.signUp() succeeds on the client.
-- Creates: the firm row, the founder's profile (role=admin, approved=true,
-- is_founder=true), the three default categories + form schemas, and a
-- default custom_roles ladder.
create or replace function create_firm_and_admin(
  p_firm_name   text,
  p_full_name   text,
  p_bar_council_state text default null
) returns uuid
language plpgsql security definer as $$
declare
  v_firm_id  uuid;
  v_slug     text;
  v_user_id  uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Must be authenticated to create a firm';
  end if;

  -- Refuse if this auth user already has a profile (idempotency guard —
  -- prevents a double-click on "Create Firm" from spawning two tenants)
  if exists (select 1 from profiles where id = v_user_id) then
    raise exception 'This account is already attached to a firm';
  end if;

  -- Build a URL-safe slug from the firm name, de-duplicated if needed
  v_slug := lower(regexp_replace(trim(p_firm_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then v_slug := 'firm'; end if;
  while exists (select 1 from firms where slug = v_slug) loop
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into firms (name, slug, plan, bar_council_state)
    values (p_firm_name, v_slug, 'trial', p_bar_council_state)
    returning id into v_firm_id;

  insert into profiles (id, firm_id, full_name, role, approved, is_founder)
    values (v_user_id, v_firm_id, p_full_name, 'admin', true, true);

  -- Seed default categories (same three as the original single-tenant app)
  insert into categories (firm_id, id, label, icon, color, built_in) values
    (v_firm_id, 'cyber',   'Cybersecurity',      'fas fa-shield-alt', 'blue',   true),
    (v_firm_id, 'rental',  'Rental / Property',  'fas fa-home',       'green',  true),
    (v_firm_id, 'general', 'General Practice',   'fas fa-gavel',      'purple', true);

  insert into form_schemas (firm_id, category_id, fields)
    select v_firm_id, c.id,
      case c.id
        when 'cyber' then '[
          {"id":"incidentDate","label":"Incident Date","type":"date","required":true},
          {"id":"breachType","label":"Breach Type","type":"select","required":true,"options":["Ransomware Attack","Data Exfiltration","Phishing / Social Engineering","Unauthorized Access","DDoS Attack","Insider Threat","Supply Chain Compromise","Zero-Day Exploit","Other"]},
          {"id":"affectedServers","label":"Affected Systems / Servers","type":"text","required":false},
          {"id":"recordsCompromised","label":"Records Compromised","type":"number","required":false},
          {"id":"regulatoryBody","label":"Regulatory Body","type":"select","required":false,"options":["CERT-In (India)","GDPR (EU)","HIPAA (US)","PDPB (India)","RBI Guidelines","SEBI Guidelines","Other"]},
          {"id":"regulatoryDeadline","label":"Regulatory Deadline","type":"date","required":false},
          {"id":"incidentSummary","label":"Incident Summary","type":"textarea","required":false},
          {"id":"forensicReport","label":"Forensic Report Filed","type":"select","required":false,"options":["No","Yes","In Progress"]},
          {"id":"priority","label":"Case Priority","type":"select","required":false,"options":["High","Medium","Low"]}
        ]'::jsonb
        when 'rental' then '[
          {"id":"propertyAddress","label":"Property Address","type":"text","required":true},
          {"id":"monthlyRent","label":"Monthly Rent","type":"number","required":true},
          {"id":"securityDeposit","label":"Security Deposit","type":"number","required":false},
          {"id":"lockinPeriod","label":"Lock-in Period (months)","type":"number","required":false},
          {"id":"agreementStart","label":"Agreement Start Date","type":"date","required":false},
          {"id":"agreementExpiry","label":"Agreement Expiry Date","type":"date","required":true},
          {"id":"renewalDate","label":"Renewal Date","type":"date","required":false},
          {"id":"propertyType","label":"Property Type","type":"select","required":false,"options":["Residential Apartment","Commercial Office","Retail Shop","Industrial Unit","Agricultural Land","Villa / Bungalow","Other"]},
          {"id":"landlord","label":"Landlord Name","type":"text","required":false},
          {"id":"landlordContact","label":"Landlord Contact","type":"tel","required":false},
          {"id":"rentalNotes","label":"Dispute / Notes","type":"textarea","required":false}
        ]'::jsonb
        else '[
          {"id":"matterDescription","label":"Matter Description","type":"text","required":true},
          {"id":"practiceArea","label":"Practice Area","type":"select","required":false,"options":["Civil Law","Criminal Law","Corporate Law","Family Law","Labour Law","Constitutional Law","Consumer Law","Intellectual Property","Tax Law","Other"]},
          {"id":"court","label":"Court / Tribunal","type":"text","required":false},
          {"id":"caseNumber","label":"Case Number / FIR","type":"text","required":false},
          {"id":"oppositeParty","label":"Opposite Party","type":"text","required":false},
          {"id":"nextHearing","label":"Next Hearing Date","type":"date","required":false},
          {"id":"judge","label":"Judge / Bench","type":"text","required":false},
          {"id":"stage","label":"Stage of Proceedings","type":"select","required":false,"options":["Filing / Pleading Stage","Evidence Stage","Arguments Stage","Judgment Pending","Appeal Filed","Execution Proceedings","Settled / Disposed"]}
        ]'::jsonb
      end
    from categories c where c.firm_id = v_firm_id;

  -- Default role ladder, mirroring the single-tenant app's seeded roles
  insert into custom_roles (firm_id, name, permissions, sort_order) values
    (v_firm_id, 'Senior Advocate',  '{"can_view_all_clients":true,"can_add_clients":true,"can_delete_clients":true,"can_assign_tasks":true,"can_create_tasks":true,"can_view_finances":true,"can_manage_users":true,"can_view_documents":true,"can_export":true}', 1),
    (v_firm_id, 'Junior Advocate',  '{"can_view_all_clients":false,"can_add_clients":true,"can_delete_clients":false,"can_assign_tasks":true,"can_create_tasks":true,"can_view_finances":false,"can_manage_users":false,"can_view_documents":true,"can_export":true}', 2),
    (v_firm_id, 'Senior Assistant', '{"can_view_all_clients":false,"can_add_clients":true,"can_delete_clients":false,"can_assign_tasks":false,"can_create_tasks":false,"can_view_finances":false,"can_manage_users":false,"can_view_documents":true,"can_export":false}', 3),
    (v_firm_id, 'Junior Assistant', '{"can_view_all_clients":false,"can_add_clients":false,"can_delete_clients":false,"can_assign_tasks":false,"can_create_tasks":false,"can_view_finances":false,"can_manage_users":false,"can_view_documents":true,"can_export":false}', 4);

  insert into invoice_settings (firm_id, firm_name) values (v_firm_id, p_firm_name);

  -- 18 pre-seeded Indian statute deadline rules, same set as v3
  insert into deadline_rules (firm_id, rule_name, statute, trigger_field, offset_days, offset_direction, description) values
    (v_firm_id, 'Written Statement (Civil)', 'CPC Order VIII Rule 1', 'created_at', 30, 'after', 'Defendant must file written statement within 30 days of service of summons'),
    (v_firm_id, 'Written Statement (Extended)', 'CPC Order VIII Rule 1 proviso', 'created_at', 90, 'after', 'Court may extend up to 90 days from date of service'),
    (v_firm_id, 'First Appeal', 'CPC Section 96 r/w Order XLI', 'nextHearing', 90, 'after', '90 days from date of decree for first appeal to High Court'),
    (v_firm_id, 'Second Appeal', 'CPC Section 100', 'nextHearing', 90, 'after', '90 days from date of decree of first appellate court'),
    (v_firm_id, 'Revision Petition (CPC)', 'CPC Section 115', 'nextHearing', 90, 'after', '90 days from date of order for civil revision'),
    (v_firm_id, 'Bail Application Hearing', 'BNSS Section 480', 'created_at', 1, 'after', 'Bail application should be heard within 24 hours of arrest/remand'),
    (v_firm_id, 'Charge Sheet Filing', 'BNSS Section 193', 'created_at', 60, 'after', 'Police must file charge sheet within 60 days for offences punishable < 10 years'),
    (v_firm_id, 'Charge Sheet (Serious)', 'BNSS Section 193 proviso', 'created_at', 90, 'after', 'Police must file charge sheet within 90 days for offences punishable with death/life/>=10 years'),
    (v_firm_id, 'Criminal Appeal (Sessions)', 'BNSS Section 415', 'nextHearing', 90, 'after', '90 days from date of conviction for appeal to High Court'),
    (v_firm_id, 'Limitation — Contract', 'Limitation Act Article 55', 'created_at', 1095, 'after', '3 years from date of breach for suit on contract'),
    (v_firm_id, 'Limitation — Tort', 'Limitation Act Article 72-74', 'created_at', 1095, 'after', '3 years from date when cause of action arose'),
    (v_firm_id, 'Limitation — Recovery of Land', 'Limitation Act Article 65', 'created_at', 4380, 'after', '12 years for suit for recovery of immovable property'),
    (v_firm_id, 'CERT-In Incident Reporting', 'IT Act Section 70B / CERT-In Rules', 'incidentDate', 0, 'after', '6 hours from detection of cybersecurity incident — report to CERT-In'),
    (v_firm_id, 'CERT-In Root Cause Report', 'CERT-In Directions 2022', 'incidentDate', 30, 'after', '30 days from incident for detailed root cause analysis report'),
    (v_firm_id, 'DPDP Data Breach Notification', 'DPDP Act Section 8', 'incidentDate', 3, 'after', '72 hours from discovery of personal data breach — notify Data Protection Board'),
    (v_firm_id, 'RBI Cyber Fraud Reporting', 'RBI Circular on Cyber Security', 'incidentDate', 0, 'after', '2–6 hours from detection of cyber fraud — report to RBI'),
    (v_firm_id, 'Rent Agreement Renewal Notice', 'Transfer of Property Act', 'agreementExpiry', 30, 'before', 'Give 30 days notice before lease expiry for renewal or vacation'),
    (v_firm_id, 'Eviction Notice Period', 'Transfer of Property Act Section 106', 'agreementExpiry', 15, 'before', '15 days notice for month-to-month tenancy; longer for annual tenancy');

  return v_firm_id;
end;
$$;

comment on function create_firm_and_admin is
  'Called once, immediately after auth.signUp() succeeds, by the user who is starting a NEW firm account (not joining an existing one via invite). Idempotent against double-submit. Security definer because the client''s anon/authenticated role has no direct INSERT grant on firms.';

-- ── 2. Join an existing firm via invite code ────────────────────────────
-- Called after auth.signUp() when the user entered an invite code instead
-- of "create a new firm." Validates the code, attaches the new profile to
-- that firm as role=assistant + approved=false (pending admin approval),
-- UNLESS the invite itself specifies role=admin (used for co-founders).
create or replace function join_firm_with_invite(
  p_invite_code text,
  p_full_name   text
) returns uuid
language plpgsql security definer as $$
declare
  v_invite   firm_invites%rowtype;
  v_user_id  uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Must be authenticated to join a firm';
  end if;
  if exists (select 1 from profiles where id = v_user_id) then
    raise exception 'This account is already attached to a firm';
  end if;

  select * into v_invite from firm_invites where code = p_invite_code
    order by created_at desc limit 1;

  if v_invite.id is null then
    raise exception 'Invalid invite code';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'This invite code has expired';
  end if;
  if v_invite.max_uses is not null and v_invite.used_count >= v_invite.max_uses then
    raise exception 'This invite code has reached its usage limit';
  end if;

  insert into profiles (id, firm_id, full_name, role, approved, is_founder)
    values (
      v_user_id, v_invite.firm_id, p_full_name,
      'assistant',                          -- always lands as assistant; admin promotes manually
      false,                                 -- always requires admin approval, even for admin-role invites
      false
    );

  update firm_invites set used_count = used_count + 1 where id = v_invite.id;

  return v_invite.firm_id;
end;
$$;

comment on function join_firm_with_invite is
  'Called after auth.signUp() when joining an EXISTING firm via invite code. New profile always starts unapproved (pending) regardless of the invite''s intended role, so a human admin always confirms new joiners — mirrors the original single-tenant approval workflow.';

-- ── 3. Seat-limit guard — call before showing "Approve" in the UI ───────
create or replace function firm_seats_available()
returns boolean language sql security definer stable as $$
  select (
    select count(*) from profiles where firm_id = current_firm_id() and approved = true
  ) < (
    select plan_seats from firms where id = current_firm_id()
  );
$$;

comment on function firm_seats_available is
  'True if the firm has not yet hit its plan seat limit. The app calls this before allowing an admin to approve a pending user — see assets/js/04-client-table.js approveUser(). Enforced server-side here in addition to the UI check, since plan_seats is the monetisation boundary.';
