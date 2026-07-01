// ════════════════════════════════════════════
//  LEXDESK ASSISTANT — Deep Indian Law + System Help
//  Conversational chat UI, no API key.
//  2-day localStorage clear. Settings toggle.
// ════════════════════════════════════════════
const BOT_KEY  = 'ld_bot_msgs';
const BOT_DATE = 'ld_bot_date';

const BOT_KB = [

// ══════════════════════════════════════════════════════════
// SYSTEM HELP
// ══════════════════════════════════════════════════════════
{ cat:'System', keywords:['add client','new client','create client','how to client'],
  q:'How do I add a new client?',
  a:'Click <strong>New Client</strong> in the top bar. A conflict-of-interest checker runs at the top — type the opposite party\'s name to flag any existing matches. Fill in the case type, client details, agreed fee, then Save. The system auto-generates a unique Client ID (e.g. CIV-001).' },

{ cat:'System', keywords:['record payment','add payment','client paid','fee received'],
  q:'How do I record a payment from a client?',
  a:'Two ways: (1) Open the client detail → <strong>Payments tab</strong> → Record Payment. (2) <strong>Finances</strong> page → expand the client row → Record Payment directly. Each entry logs amount, date, method (Cash/UPI/NEFT/Cheque), and an optional reference note.' },

{ cat:'System', keywords:['task workflow','task status','kanban','in review','assign task'],
  q:'How does the task workflow work?',
  a:'The Senior Advocate creates and assigns tasks. Flow: <strong>Open → In Progress → In Review → Approved</strong>. Assistants click "Start Work" then "Send for Review" when done. The Senior Advocate can Approve & Close, Rework, or Cancel. Task fields lock once the task moves past Open.' },

{ cat:'System', keywords:['portal','client link','client access','share case'],
  q:'How does the client portal work?',
  a:'Open any client detail → click <strong>Portal Link</strong> in the footer. You get a unique URL plus a 4-digit PIN. Share them on <em>separate channels</em> — link by email, PIN by SMS. The client enters the PIN to view their case status, fee summary, payments, and uploaded documents. No LexDesk account needed. Links expire after 90 days.' },

{ cat:'System', keywords:['invoice','generate invoice','pdf invoice','bill client'],
  q:'How do I generate a PDF invoice?',
  a:'Open a client detail → click <strong>Invoice</strong> in the footer. A print-ready invoice opens in a new browser tab — use Print → Save as PDF. First fill in your firm details in <strong>Settings → Invoice Settings</strong> (firm name, address, bar number, footer text). Invoice numbers auto-increment.' },

{ cat:'System', keywords:['group chat','group','new group','create group','team group'],
  q:'How do I create a group chat?',
  a:'Go to <strong>Messages</strong> → click <strong>New Group</strong> at the bottom of the contact list. Give the group a name, select members, and create. The Senior Advocate is automatically added as a group admin. Admins can rename the group and add/remove members using the ⚙ gear icon next to the group name.' },

{ cat:'System', keywords:['search message','find contact','message search'],
  q:'How do I find a specific person to message?',
  a:'The Messages sidebar has a search bar at the top. Type a name to filter Direct Messages and Groups simultaneously. Results update as you type.' },

{ cat:'System', keywords:['court deadline','deadline rules','filing calculator','statute deadline'],
  q:'How do court filing deadline rules work?',
  a:'Go to <strong>Admin → Deadline Rules</strong>. Rules like "Written Statement: 30 days after case creation" are pre-seeded with 18 common Indian statutes (CPC, CrPC, Limitation Act, CERT-In, DPDP Act). Open any client → <strong>Deadlines tab</strong> to see all computed deadlines based on that case\'s dates. Red = overdue, orange = within 30 days.' },

{ cat:'System', keywords:['custom role','permission','hierarchy','team role','assign role'],
  q:'How do I set up team roles and hierarchy?',
  a:'Go to <strong>Admin → Roles</strong>. Create roles like "Junior Advocate" or "Senior Assistant" with 9 granular permission toggles (view clients, add clients, delete clients, assign tasks, view finances, manage users, export, etc.). Assign roles from <strong>Users</strong> by editing any team member. The hierarchy strip in the Users page shows member count per role.' },

{ cat:'System', keywords:['archive user','remove user','permanently remove','leave organization'],
  q:'How do I archive or remove a team member?',
  a:'Go to <strong>Users</strong>. Archive button (📦) removes access but keeps all their data — they can be restored. Permanently Remove (🗑) deletes the profile forever. The Founder (first signup) is fully protected — they can never be archived or removed by anyone.' },

{ cat:'System', keywords:['forgot password','reset password','cant login','change password'],
  q:'How do I reset or change my password?',
  a:'On the login screen click <strong>Forgot Password?</strong> — enter your email and you\'ll receive a reset link from Supabase (noreply@mail.app.supabase.io). Clicking the link opens LexDesk with a Change Password prompt. You can also change your password anytime under <strong>Settings → Change Password</strong>.' },

{ cat:'System', keywords:['conflict check','opposite party','conflict interest'],
  q:'How does the conflict of interest checker work?',
  a:'When adding a new client, there\'s a search field at the top of the form. Type the opposite party\'s name — the system instantly scans all existing clients and their opposite-party fields and shows a red warning if a match is found. You can still proceed but the conflict is documented.' },

{ cat:'System', keywords:['note share','private note','team note','share note'],
  q:'How do I share a note with a team member?',
  a:'Go to <strong>Notes</strong> → open your note → click <strong>Share</strong>. Assign Viewer (read-only) or Editor permission. You can change or revoke access at any time. Tick "Send chat message" to notify them instantly. Note edit history is visible to the note owner.' },

{ cat:'System', keywords:['theme','appearance','dark mode','light mode','colour','customise'],
  q:'How do I customise my theme?',
  a:'Go to <strong>Settings → Appearance & Theme</strong>. You can change: (1) <strong>Base Mode</strong> — Dark Glass or Light Glass; (2) <strong>Accent Colour</strong> — Gold, Blue, Teal, Rose, Violet, Emerald, Amber, Slate; (3) <strong>Background Tint</strong> — Midnight, Charcoal, Navy, Forest, Plum; (4) <strong>Text Contrast</strong> — Standard, High, Soft. Your theme is saved to your profile and syncs across devices.' },

{ cat:'System', keywords:['chatbot','bot','disable chatbot','turn off chatbot'],
  q:'How do I turn the chatbot on or off?',
  a:'Go to <strong>Settings</strong> → scroll to the Chatbot toggle and switch it off. The floating robot button disappears. Turn it back on from the same settings row. Chat history clears automatically every 2 days.' },

{ cat:'System', keywords:['finances','firm finances','outstanding balance','fee tracker'],
  q:'How does the Finances page work?',
  a:'Visible to the Senior Advocate only. Three summary cards show Total Fees Quoted, Total Collected, and Outstanding Balance firm-wide. Every client appears in a list with a payment progress bar and Paid/Partial/Unpaid badge. Expand any client row to see the full dated ledger and record new payments directly.' },

// ══════════════════════════════════════════════════════════
// BNS / BNSS / BSA 2024
// ══════════════════════════════════════════════════════════
{ cat:'BNS/BNSS 2024', keywords:['bns','bnss','bsa','new criminal law','2024','bharatiya nyaya','replaced ipc'],
  q:'What changed with BNS, BNSS and BSA from July 2024?',
  a:'Three new codes replaced colonial laws effective <strong>1 July 2024</strong>:<br/>(1) <strong>Bharatiya Nyaya Sanhita (BNS) 2023</strong> — replaces IPC 1860. Defines crimes and punishments. New: organised crime (Section 111), terrorism (Section 113), crimes against women consolidated in Chapter V.<br/>(2) <strong>Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023</strong> — replaces CrPC 1973. New: Zero FIR, 7-day police custody in tranches, mandatory video-recording of searches, trial in absentia, 90-day max undertrial detention before bail entitlement.<br/>(3) <strong>Bharatiya Sakshya Adhiniyam (BSA) 2023</strong> — replaces Evidence Act 1872. Electronic records explicitly admissible, secondary evidence rules expanded.' },

{ cat:'BNS/BNSS 2024', keywords:['zero fir','file fir anywhere','fir anywhere','no jurisdiction fir'],
  q:'What is Zero FIR under BNSS?',
  a:'Under <strong>Section 173 BNSS</strong>, a Zero FIR can be filed at <em>any police station</em> regardless of jurisdiction. The receiving station must register the FIR and transfer it to the station having jurisdiction within 15 days. The accused cannot object to investigation on grounds that the FIR was filed at a non-jurisdictional station. This was a major reform — earlier <em>Lalita Kumari v UP (2013)</em> mandated registration but still required the correct station.' },

{ cat:'BNS/BNSS 2024', keywords:['section 111 bns','organised crime','bns 111','criminal organisation'],
  q:'What is Section 111 BNS (organised crime)?',
  a:'<strong>Section 111 BNS</strong> — new standalone provision for organised crime (did not exist in IPC). Defines organised crime as any continuing unlawful activity by an organised crime syndicate involving violence, intimidation, coercion, or other unlawful means. Punishment: death or life imprisonment + fine ≥ ₹10 lakh. Mere membership of such a syndicate: 5-10 years. Section 112 covers petty organised crime (separately).' },

{ cat:'BNS/BNSS 2024', keywords:['community service','bns punishment','new punishment','community service sentence'],
  q:'What is the community service punishment introduced in BNS?',
  a:'<strong>BNS introduces community service</strong> as a new form of punishment — the first time in Indian criminal law. It is an alternative to imprisonment or fine for minor offences. E.g., Section 202 BNS (attempt to commit suicide) prescribes community service instead of the old IPC imprisonment. Courts can award it for specified offences where the accused has no criminal history. The form and duration of service are at the court\'s discretion.' },

{ cat:'BNS/BNSS 2024', keywords:['undertrial bail','90 days bail','bnss 479','default bail undertrial'],
  q:'What is the undertrial bail provision under BNSS?',
  a:'<strong>Section 479 BNSS</strong> (formerly Section 436A CrPC but significantly modified): An undertrial prisoner who has served <strong>one-third of the maximum sentence</strong> for the offence (half for a first-time offender) is entitled to bail as a matter of right. Courts must conduct a review every 6 months. The provision also allows bail if the trial is not likely to be completed within the prescribed period. This replaces the earlier half-period rule under Section 436A.' },

// ══════════════════════════════════════════════════════════
// CIVIL LAW — CPC, EVIDENCE, CONTRACT
// ══════════════════════════════════════════════════════════
{ cat:'Civil Law', keywords:['limitation period','time limit','how long','when to file','suit limitation'],
  q:'What are the limitation periods for common civil suits?',
  a:'Under <strong>Limitation Act 1963</strong>:<br/>• Contract breach — 3 years from breach (Article 55)<br/>• Money recovery — 3 years<br/>• Recovery of immovable property — 12 years (Article 65)<br/>• Mortgage — 12 years for redemption, 30 years for foreclosure<br/>• Tort/negligence — 3 years from date damage occurs<br/>• Setting aside decree — 30 days (for parties) or 90 days (for others)<br/>Section 5 allows condonation of delay for sufficient cause (except Articles 114, 116, 117).' },

{ cat:'Civil Law', keywords:['injunction','interim injunction','stay','temporary injunction','order 39'],
  q:'How do I get an interim injunction?',
  a:'File an IA under <strong>Order XXXIX CPC</strong> with a supporting affidavit. Three cumulative requirements (all must be satisfied): (1) <em>Prima facie case</em> — arguable, not necessarily strong; (2) <em>Balance of convenience</em> — you suffer more if refused than defendant suffers if granted; (3) <em>Irreparable injury</em> — damages cannot adequately compensate. Ex-parte order: show extreme urgency, file affidavit explaining why notice should not be given. Key cases: <em>Dalpat Kumar v Prahlad Singh AIR 1992 SC 1620</em>; <em>Wander Ltd v Antox India (1990) Supp SCC 727</em>.' },

{ cat:'Civil Law', keywords:['res judicata','same case again','issue estoppel','constructive res judicata'],
  q:'What is res judicata and constructive res judicata?',
  a:'<strong>Section 11 CPC — Res Judicata</strong>: Bars re-litigation of issues <em>directly and substantially</em> in issue, between the same parties (or their privies), decided by a competent court. All six conditions under the section must be satisfied. <strong>Constructive res judicata (Explanation IV)</strong>: Bars issues that <em>ought to have been raised</em> in the former suit. A party cannot split a cause of action or leave out issues to litigate later. Distinction: res judicata bars re-agitation of decided issues; constructive res judicata bars issues that should have been raised. Key case: <em>Satyadhyan Ghosal v Deoranjin Debi AIR 1960 SC 941</em>.' },

{ cat:'Civil Law', keywords:['specific performance','enforce contract','specific relief','section 10'],
  q:'When can specific performance of a contract be enforced?',
  a:'Under <strong>Specific Relief Act 1963 (amended 2018)</strong>, Section 10 now makes specific performance of contracts <em>mandatory</em> — the 2018 amendment removed the court\'s discretion to refuse merely because damages are adequate. Exceptions: contracts requiring personal skill/ability, contracts dependent on continued supervision, contracts with no objective assessment of performance, contracts that have become unlawful. Section 20 allows substituted performance as an alternative. Section 41 still allows courts to award compensation in lieu of or in addition to specific performance.' },

{ cat:'Civil Law', keywords:['summary suit','order 37','negotiable instrument suit','bill suit'],
  q:'What is a summary suit under Order XXXVII CPC?',
  a:'<strong>Order XXXVII CPC</strong> — available for suits on: bills of exchange, hundis, promissory notes, or claims for a liquidated sum under a written contract. Plaintiff files suit with a special summons. Defendant must apply for <em>leave to defend</em> within 10 days of service (extendable by court). If leave refused — immediate decree for plaintiff. If leave granted conditionally — defendant may be asked to deposit security. Key advantage: avoids full trial if defendant has no arguable defence. Court cannot refuse leave on merits alone — must be shown there is a triable issue.' },

// ══════════════════════════════════════════════════════════
// CRIMINAL LAW — BNS provisions
// ══════════════════════════════════════════════════════════
{ cat:'Criminal Law', keywords:['bail','bail application','non bailable','apply bail','section 480'],
  q:'How do I apply for bail under BNSS 2023?',
  a:'<strong>Section 480 BNSS</strong> (replaces 437 CrPC): For non-bailable offences, application goes before the Magistrate. Court considers: gravity of offence, antecedents, flight risk, evidence tampering risk, impact on victims/society. <strong>Section 483 BNSS</strong> (replaces 439 CrPC): Sessions Court or High Court bail — broader discretion, can impose conditions. <strong>Section 482 BNSS</strong> (replaces 438 CrPC): Anticipatory bail — apply before arrest to Sessions Court or HC; on arrest, accused released on bail immediately. Conditions commonly imposed: reporting to police, surrendering passport, not contacting complainant.' },

{ cat:'Criminal Law', keywords:['arrested person rights','custody rights','police arrest rights','article 22'],
  q:'What are the rights of an arrested person?',
  a:'Constitutional + BNSS rights:<br/>(1) Article 22 — Right to know grounds of arrest; right to consult a lawyer of choice immediately;<br/>(2) Section 47 BNSS — Inform one friend/relative of arrest immediately;<br/>(3) Section 53 BNSS — Right to medical examination by government doctor;<br/>(4) Article 20(3) — Right against self-incrimination;<br/>(5) Article 22(2) — Production before Magistrate within 24 hours;<br/>(6) <em>D.K. Basu v WB (1997) 1 SCC 416</em> — Arrest memo, witness to arrest, identity of arresting officer, no torture.<br/>(7) Women: Cannot be arrested after sunset or before sunrise except with female officer and written prior permission of Magistrate (Section 43(5) BNSS).' },

{ cat:'Criminal Law', keywords:['murder','section 101 bns','culpable homicide','325 bns','302 ipc'],
  q:'What is murder under BNS 2023?',
  a:'<strong>Section 101 BNS</strong> (replaces Section 302 IPC): Murder — death caused intentionally or with knowledge that the act is imminently dangerous. Punishment: death or life imprisonment + fine. <strong>Section 100 BNS</strong> (replaces Section 299/304 IPC): Culpable homicide not amounting to murder — 10 years or life + fine (Part 1: intentional act); up to 10 years + fine (Part 2: knowledge without intention). The classic distinction from <em>Reg v Govinda (1876)</em> still applies: presence/absence of intention to cause death or injury likely to cause death separates the two.' },

{ cat:'Criminal Law', keywords:['rape','sexual assault','section 63 bns','pocso','gangrape'],
  q:'What are the rape/sexual assault provisions under BNS?',
  a:'<strong>Section 63 BNS</strong> (replaces 375 IPC): Rape — non-consensual sexual intercourse. Punishment (Section 64): 10 years min – life + fine. Aggravated rape (Section 65): 20 years min – life. Gang rape (Section 70): 20 years min – life or death. Sexual assault other than rape now separately defined (Section 74 BNS). <strong>POCSO Act 2012</strong> continues to apply for offences against children (under 18) — special courts, stricter timelines (trial within 1 year), child-friendly procedures. New in BNS: sexual intercourse by deceit of marriage (Section 69) — 10 years + fine.' },

{ cat:'Criminal Law', keywords:['cheating','fraud','section 318 bns','420 ipc','dishonest'],
  q:'What constitutes cheating under BNS?',
  a:'<strong>Section 318 BNS</strong> (replaces 420 IPC): Cheating — deceiving a person and dishonestly inducing them to deliver property or alter/destroy a document. Section 318(4): Cheating with value exceeding ₹50 lakh — 7 years + fine. For corporate fraud: <strong>Section 447 Companies Act 2013</strong> runs alongside (6 months–10 years imprisonment + fine ≥ amount involved). Distinction: cheating under BNS requires both deception AND inducement to act; criminal breach of trust (Section 316 BNS, replaces 405 IPC) involves misappropriation of property entrusted.' },

{ cat:'Criminal Law', keywords:['extortion','ransom','section 308 bns','384 ipc','threat'],
  q:'What is extortion and what are the penalties?',
  a:'<strong>Section 308 BNS</strong> (replaces 384 IPC): Extortion — intentionally putting a person in fear of injury to dishonestly induce delivery of property or doing an act. Punishment: up to 3 years + fine. Aggravated extortion (Section 309): putting person in fear of death/grievous hurt or accusing of serious crime — up to 10 years + fine. Kidnapping for ransom (Section 140 BNS): death or life imprisonment. Cyber extortion (Section 66E IT Act + Section 308 BNS): both may apply. For ransomware attacks, also report to CERT-In within 6 hours.' },

{ cat:'Criminal Law', keywords:['anticipatory bail','438 crpc','section 482 bnss','anticipatory','fear of arrest'],
  q:'How does anticipatory bail work under BNSS?',
  a:'<strong>Section 482 BNSS</strong> (replaces 438 CrPC): Application when a person has reason to believe they may be arrested for a non-bailable offence. Filed before Sessions Court or High Court. Court considers: nature and gravity of accusation, antecedents, possibility of flight, whether accusation is made to humiliate. On arrest, person released on bail immediately — anticipatory bail operates from the moment of arrest. Conditions: reporting to police, not leaving country, surrendering passport, not tampering with evidence, not contacting complainant. The anticipatory bail may be limited in time or made absolute — court has full discretion per <em>Sushila Aggarwal v State (Delhi) (2020) 5 SCC 1</em> (SC Constitution Bench).' },

// ══════════════════════════════════════════════════════════
// GST & TAX LAW
// ══════════════════════════════════════════════════════════
{ cat:'Tax Law', keywords:['gst advocate','rcm legal services','gst lawyer','gst on fees'],
  q:'What GST applies to legal services by advocates?',
  a:'Under <strong>GST Notification 13/2017-CT (Rate)</strong>:<br/>• Advocate/law firm to <strong>business entity</strong>: <strong>18% GST under Reverse Charge Mechanism (RCM)</strong> — the business client pays GST directly to govt, not the advocate.<br/>• Advocate to <strong>individual/personal</strong>: <strong>Exempt</strong> (Entry 45, Exemption Notification).<br/>• Advocate to <strong>another advocate</strong> (joint cases): <strong>Exempt</strong>.<br/>• <strong>Senior Advocate</strong> to another advocate/law firm: 18% <em>forward charge</em> — senior advocate collects and deposits.<br/>• Advocate\'s turnover > ₹20 lakh: registration required, but since most supplies are exempt/RCM, most advocates don\'t collect GST and need not register unless they provide other taxable services.' },

{ cat:'Tax Law', keywords:['income tax advocate','section 44ada','44ab','professional tax return'],
  q:'What are the income tax obligations for advocates?',
  a:'(1) <strong>Section 44ADA</strong>: If gross receipts ≤ ₹75 lakh (Budget 2024 limit), 50% is deemed profit — no books of accounts required, audit not needed. (2) Above ₹75 lakh: Maintain books under Section 44AA, mandatory tax audit under Section 44AB. (3) <strong>TDS — Section 194J</strong>: Companies and firms deduct 10% TDS on professional fees paid to advocates. (4) <strong>Advance tax</strong>: Quarterly instalments — 15 June (15%), 15 Sept (45%), 15 Dec (75%), 15 March (100%). (5) Deductible expenses: office/chamber rent, clerk salaries, library subscriptions, court fees, professional body membership, travel for cases.' },

{ cat:'Tax Law', keywords:['capital gains 2024','ltcg','stcg','budget 2024 capital gains','indexation removed'],
  q:'What changed in capital gains tax in Budget 2024?',
  a:'<strong>Major Budget 2024 changes (effective 23 July 2024)</strong>:<br/>• <strong>STCG on listed equity/equity MF</strong>: Increased from 15% → <strong>20%</strong> (holding ≤ 12 months)<br/>• <strong>LTCG on listed equity/equity MF</strong>: Increased from 10% → <strong>12.5%</strong> above ₹1.25 lakh exemption (holding > 12 months)<br/>• <strong>LTCG on immovable property</strong>: Rate reduced from 20% (with indexation) → <strong>12.5% without indexation</strong> — taxpayers born before 2001 who hold pre-2001 property may claim cost inflation but lose indexation benefit<br/>• Holding period for all other assets: < 24 months = STCG; ≥ 24 months = LTCG<br/>• Section 54 exemption cap: ₹10 crore (for reinvestment in residential property).' },

{ cat:'Tax Law', keywords:['gst input tax credit','itc','itc blocked','section 17(5)'],
  q:'What are the blocked credits under GST Section 17(5)?',
  a:'<strong>Section 17(5) CGST Act</strong> — Input Tax Credit (ITC) is blocked (cannot be claimed) on:<br/>(a) Motor vehicles for transportation of persons with seating ≤ 13 (unless used for further supply of such vehicles, transport of passengers/services, driving school, or tour operator);<br/>(b) Food, beverages, beauty treatment, health services, cosmetic/plastic surgery, club memberships, rent-a-cab (unless same category of outward supply or obligation under employment law);<br/>(c) Life/health insurance (unless obligation under any law or for supply of similar insurance);<br/>(d) Works contract services for construction of immovable property (not plant and machinery);<br/>(e) Goods/services for personal consumption;<br/>(f) Goods lost, stolen, destroyed, written off.' },

{ cat:'Tax Law', keywords:['income tax notice','section 148','section 143','income tax scrutiny','reassessment'],
  q:'What are the common income tax notices and how to respond?',
  a:'<strong>Common notices</strong>:<br/>• <strong>Section 143(1)</strong>: Intimation after return processing — check for mismatches; respond within 30 days if demand; can file rectification under Section 154.<br/>• <strong>Section 143(2)</strong>: Scrutiny selection — time limit to issue is 6 months from end of FY in which return filed; respond to questionnaire with supporting documents.<br/>• <strong>Section 148/148A</strong> (amended 2021): Reassessment — Section 148A inquiry mandatory before issue of 148 notice; taxpayer gets 7+ days to respond; reopening up to 3 years (escaped income ≥ ₹50 lakh: up to 10 years); Supreme Court in <em>Union of India v Ashish Agarwal (2022)</em> validated the amended procedure retroactively.<br/>• Always respond through the <strong>e-filing portal (income tax.gov.in)</strong>; keep acknowledgement.' },

// ══════════════════════════════════════════════════════════
// COMPANIES ACT & CORPORATE
// ══════════════════════════════════════════════════════════
{ cat:'Companies Act', keywords:['companies act','director duties','section 166','fiduciary duty'],
  q:'What are the duties of directors under Companies Act 2013?',
  a:'<strong>Section 166 Companies Act 2013</strong>:<br/>(1) Act in good faith in best interests of company, shareholders, employees, community, environment;<br/>(2) Exercise due care, skill, and diligence of a reasonably diligent person with same knowledge;<br/>(3) Exercise independent judgment (cannot be fettered by any external direction);<br/>(4) Avoid conflict of interest — must disclose under Section 184 even if interest is indirect;<br/>(5) Not achieve undue gain — return any gain to company;<br/>(6) Not assign directorship.<br/>Penalties: Section 166(7) — ₹1-5 lakh per default per day. Section 447 — fraud (imprisonment 6 months – 10 years + fine if dishonest intent). Section 149(8) read with Schedule IV — additional duties for independent directors including protecting minority shareholders.' },

{ cat:'Companies Act', keywords:['ibc','insolvency','nclt','cirp','resolution plan','bankruptcy'],
  q:'How does IBC insolvency resolution work?',
  a:'<strong>IBC 2016 — CIRP (Corporate Insolvency Resolution Process)</strong>:<br/>Trigger: Default of ₹1 crore+ (raised from ₹1 lakh). Filed by: financial creditor (Section 7), operational creditor (Section 9), or corporate debtor (Section 10) before NCLT.<br/>NCLT admits within 14 days → IRP appointed → <strong>Moratorium</strong> declared (no suits, no asset transfers) → CoC formed (financial creditors only) → Resolution applicants submit plans → CoC approves with <strong>66% vote</strong> → NCLT approves → Implementation.<br/>Timeline: <strong>180 days</strong> (extendable to 330 days max including litigation). If no plan → liquidation.<br/>Key cases: <em>Essar Steel India v Satish Kumar Gupta (2019)</em> — CoC\'s commercial wisdom is paramount, operational creditors cannot be discriminated. <em>Swiss Ribbons v Union of India (2019)</em> — constitutional validity upheld.' },

{ cat:'Companies Act', keywords:['section 447','fraud companies act','corporate fraud','mca fraud'],
  q:'What constitutes fraud under Section 447 Companies Act?',
  a:'<strong>Section 447 Companies Act 2013</strong>: Fraud = any act, omission, concealment, abuse of position committed with intent to deceive, to gain undue advantage, or to injure the interests of company/shareholders/creditors/employees. Punishment: imprisonment <strong>6 months – 10 years</strong> + fine (not less than amount involved, up to 3×). For fraud involving <em>public interest</em> or amount > ₹10 lakh: minimum 3 years. No compounding allowed. Professionals (CA/CS/CWA/advocates) involved in fraud: 6 months – 10 years + fine. SFIO (Serious Fraud Investigation Office) investigates under Section 212 — arrest powers without warrant.' },

{ cat:'Companies Act', keywords:['startup exemptions','opc','one person company','startup india','angel tax'],
  q:'What are the key startup and OPC provisions?',
  a:'<strong>Startup India / DPIIT Recognition</strong>: Eligible for: tax holiday (3 of first 10 years under Section 80-IAC), self-certification under labour laws, fast-track patent examination, Section 68 ITA protection (angel tax exemption if total paid-up share capital + securities premium ≤ ₹25 crore after the issue). Angel Tax under Section 56(2)(viib) — for unlisted companies issuing shares at premium above fair value — DPIIT-recognised startups exempt. <strong>One Person Company (OPC)</strong>: single member with nominee, minimum ₹1 lakh paid-up, automatic conversion to private limited if paid-up capital > ₹50 lakh or turnover > ₹2 crore. OPC exempted from many provisions (AGM, rotation of auditors, etc.).' },

// ══════════════════════════════════════════════════════════
// CYBER LAW — IT Act + DPDP + CERT-In
// ══════════════════════════════════════════════════════════
{ cat:'Cyber Law', keywords:['it act offences','hacking','cyber crime','section 66','computer offences'],
  q:'What are the main offences under the IT Act 2000?',
  a:'<strong>IT Act 2000 key sections</strong>:<br/>• S.43: Civil penalty for unauthorised access/damage — up to ₹1 crore<br/>• S.66: Computer-related offences (hacking, data theft) — 3 years + ₹5 lakh<br/>• S.66B: Receiving stolen computer resource — 3 years + ₹1 lakh<br/>• S.66C: Identity theft — 3 years + ₹1 lakh<br/>• S.66D: Cheating by personation using computer — 3 years + ₹1 lakh<br/>• S.66E: Privacy violation (capturing/transmitting private images) — 3 years<br/>• S.66F: Cyber terrorism — life imprisonment<br/>• S.67: Publishing obscene material — 3 years + ₹5 lakh (first); 5 years + ₹10 lakh (repeat)<br/>• S.67A: Sexually explicit material — 5 years (first), 7 years (repeat)<br/>• S.67B: Child sexual abuse material — 5 years (first), 7 years (repeat)<br/>S.66A was struck down in <em>Shreya Singhal v UOI (2015)</em>.' },

{ cat:'Cyber Law', keywords:['cert-in','cyber incident reporting','6 hours','certify-in report','mandatory report'],
  q:'What are the CERT-In mandatory incident reporting obligations?',
  a:'Under <strong>CERT-In Directions 2022</strong>: 20 categories of cybersecurity incidents must be reported within <strong>6 hours of detection/noticing</strong> (not 24/72 hours). Covered entities: all service providers, intermediaries, data centres, corporate bodies, government organisations. Obligations: (1) Report via cert-in.org.in portal; (2) Maintain all ICT logs within India for <strong>180 days</strong>; (3) Sync system clocks with NTP servers traceable to NTP.gov.in or NPLI; (4) VPN/Cloud/VPS providers: subscriber records for <strong>5 years</strong>; (5) Root cause analysis report within 30 days. Penalty: Section 70B(7) IT Act — imprisonment up to 1 year + fine. <em>Note: These requirements apply even to small companies if they are service providers/intermediaries.</em>' },

{ cat:'Cyber Law', keywords:['dpdp act','data protection','personal data','data principal','data fiduciary'],
  q:'What are the key obligations under DPDP Act 2023?',
  a:'<strong>Digital Personal Data Protection Act 2023</strong> — India\'s first comprehensive data privacy law:<br/>• <strong>Lawful basis</strong>: Consent (free, specific, informed, unconditional, unambiguous) or legitimate uses (e.g., state functions, medical emergencies, employment).<br/>• <strong>Data Fiduciary duties</strong>: Purpose limitation, data minimisation, accuracy, storage limitation, security safeguards (reasonable), breach notification to Data Protection Board and data principals.<br/>• <strong>Data Principal rights</strong>: Access, correction, erasure, grievance redressal, nomination of another person for data access on death/incapacity.<br/>• <strong>Significant Data Fiduciaries</strong> (notified): Must appoint DPO (India-based), conduct DPIA, appoint Data Auditor.<br/>• <strong>Cross-border transfer</strong>: Only to notified whitelist countries.<br/>• <strong>Penalties</strong>: Up to ₹250 crore per violation.<br/>• Children\'s data: no tracking/behavioural monitoring; verifiable parental consent required.' },

// ══════════════════════════════════════════════════════════
// FAMILY LAW
// ══════════════════════════════════════════════════════════
{ cat:'Family Law', keywords:['divorce','grounds divorce','hma','mutual consent','section 13'],
  q:'What are the grounds for divorce under the Hindu Marriage Act?',
  a:'<strong>Section 13 HMA 1955 — Fault grounds</strong>: (1) Adultery; (2) Cruelty (physical or mental); (3) Desertion for ≥ 2 continuous years; (4) Conversion to another religion; (5) Unsoundness of mind for ≥ 3 continuous years; (6) Incurable leprosy; (7) Communicable venereal disease; (8) Renunciation of world; (9) Presumed dead (7 years unheard of). <strong>Section 13-B — Mutual Consent</strong>: Both file joint petition after living separately ≥ 1 year; 6-month cooling period (courts can waive if marriage is irretrievably broken — <em>Amardeep Singh v Harveen Kaur 2017 8 SCC 746</em>); second motion within 6-18 months. Under <em>Shilpa Sailesh v Varun Sreenivasan (2023) 12 SCC 544</em>, Supreme Court under Article 142 can dissolve marriage on irretrievable breakdown even without HMA grounds.' },

{ cat:'Family Law', keywords:['maintenance','alimony','section 125','spouse maintenance','BNSS 144'],
  q:'How is maintenance determined under Indian law?',
  a:'Multiple overlapping provisions:<br/>• <strong>Section 144 BNSS</strong> (replaces 125 CrPC): Magistrate can award for wife, legitimate/illegitimate minor children, parents unable to maintain themselves. Quantum: based on means and needs, no ceiling. Interim maintenance pending final order: Section 145 BNSS.<br/>• <strong>Section 24 HMA</strong>: Maintenance pendente lite during matrimonial proceedings.<br/>• <strong>Section 25 HMA</strong>: Permanent alimony — lump sum or monthly; modified if circumstances change. <em>Rajnesh v Neha (2020) 14 SCC 768</em>: SC mandated uniform affidavit of assets/liabilities; factors — income of both parties, status of living during marriage, number and age of children, wife\'s earning capacity, reasonable needs. Cannot be waived by prior agreement (<em>Maya Devi v Jagdish Prasad 2007</em>).' },

{ cat:'Family Law', keywords:['child custody','guardian','section 6 hmga','best interest','hague convention'],
  q:'How is child custody decided in India?',
  a:'Governed by <strong>Guardians and Wards Act 1890</strong> (secular) and <strong>Hindu Minority and Guardianship Act 1956</strong> (Hindus). <strong>Paramount principle</strong>: welfare/best interests of the child — not ownership rights of parents. Under HMGA Section 6(a): mother preferred for children below 5 years. Father is natural guardian for Hindu children after 5, but courts give it based on fitness. Courts consider: (a) physical and emotional needs of child, (b) financial capacity, (c) bond established, (d) child\'s expressed preference (if old enough), (e) stability of environment, (f) siblings together principle. Joint custody is increasingly granted. <strong>International abduction</strong>: India is NOT a signatory to Hague Convention 1980; HC applies welfare principle under parens patriae jurisdiction — <em>Surya Vadanan v State of TN (2015)</em>.' },

// ══════════════════════════════════════════════════════════
// LABOUR LAW
// ══════════════════════════════════════════════════════════
{ cat:'Labour Law', keywords:['4 labour codes','new labour laws','labour codes india','code on wages'],
  q:'What are the 4 Labour Codes and their status?',
  a:'Four codes consolidate 29 central labour laws (all enacted, awaiting state implementation rules):<br/>(1) <strong>Code on Wages 2019</strong>: Merges Minimum Wages Act, Payment of Wages Act, Equal Remuneration Act, Payment of Bonus Act. Universal floor wage. Electronic payment of wages.<br/>(2) <strong>Industrial Relations Code 2020</strong>: Merges Trade Unions Act, ID Act, Industrial Employment (Standing Orders) Act. Retrenchment threshold raised to 300 workers (from 100) for prior government permission requirement.<br/>(3) <strong>Social Security Code 2020</strong>: Merges EPF, ESI, Gratuity, Maternity Benefit, ESIC extended to gig/platform workers. Aggregator (Ola, Swiggy, etc.) to contribute to social security fund for gig workers.<br/>(4) <strong>OSH Code 2020</strong>: Merges Factories Act, Mines Act, Contract Labour Act. Single licence for contract labour, audio-visual contract for migrant workers.<br/>Until notification: <em>old laws continue to apply.</em>' },

{ cat:'Labour Law', keywords:['posh','sexual harassment work','icc','internal committee','posh complaint'],
  q:'What are employer obligations under the POSH Act 2013?',
  a:'<strong>Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act 2013</strong>:<br/>Applies to ALL establishments (no employee threshold for ICC). Obligations:<br/>(1) Constitute <strong>ICC</strong> (Internal Complaints Committee) — minimum 4 members, presiding officer must be woman employed at senior level, at least one external member (from NGO/legal background);<br/>(2) Constitute <strong>LCC</strong> (Local Complaints Committee) for establishments with < 10 employees, via District Officer;<br/>(3) Display policy at conspicuous place;<br/>(4) Conduct annual awareness programmes;<br/>(5) ICC inquiry within <strong>90 days</strong> — accused gets 3 working days to respond to complaint, 3 more to respond to inquiry report;<br/>(6) Action within 60 days of ICC report;<br/>(7) Annual report to District Officer.<br/>Non-constitution of ICC: ₹50,000 fine (double for repeat + licence cancellation). Extended to: interns, contractual workers, domestic workers. Gig workers: Code on Social Security 2020 extends protection.' },

{ cat:'Labour Law', keywords:['epf','esic','pf','provident fund','esi compliance'],
  q:'What are EPF and ESI compliance requirements?',
  a:'<strong>EPF & MP Act 1952</strong>: Applies to establishments ≥ 20 employees (notified sectors). Contribution: Employee 12% of basic+DA; Employer 12% (8.33% → EPS Pension, 3.67% → EPF, 0.5% → EDLI insurance). UAN is portable. Deadline: contribution by 15th of following month. Non-compliance: damages 5-25% of arrears + prosecution under Section 14 (up to 1-3 years + fine).<br/><strong>ESI Act 1948</strong>: Applies to ≥ 10 employees in notified areas; gross wages ≤ ₹21,000/month (₹25,000 for persons with disability). Contribution: Employee 0.75%, Employer 3.25%. Benefits: unlimited medical (employee + family), sickness (70% wages for 91 days), maternity (26 weeks full wages), disablement, dependants\' benefit. Non-compliance: Section 84-85 ESI Act — imprisonment up to 2 years + fine.' },

// ══════════════════════════════════════════════════════════
// CONSTITUTIONAL LAW
// ══════════════════════════════════════════════════════════
{ cat:'Constitutional', keywords:['fundamental rights','article 21','right to life','privacy','part iii'],
  q:'What fundamental rights has the Supreme Court recognised under Article 21?',
  a:'Article 21 — "No person shall be deprived of his life or personal liberty except according to procedure established by law" — has been expansively interpreted. Recognised rights include:<br/>• Right to <strong>privacy</strong> (<em>K.S. Puttaswamy v Union of India 2017</em> — 9-judge bench)<br/>• Right to <strong>livelihood</strong> (<em>Olga Tellis v BMC 1985</em>)<br/>• Right to <strong>health</strong> (<em>Paschim Banga Khet Mazdoor Samity v WB 1996</em>)<br/>• Right to <strong>speedy trial</strong> (<em>Hussainara Khatoon v Home Secretary Bihar 1979</em>)<br/>• Right to <strong>legal aid</strong> (now also Article 39A)<br/>• Right to <strong>education</strong> (now Article 21A, also RTE Act 2009)<br/>• Right to <strong>clean environment</strong> (<em>MC Mehta cases</em>)<br/>• Right to <strong>dignity</strong> (<em>Francis Coralie Mullin v UT of Delhi 1981</em>)<br/>The "procedure" must now be: just, fair, reasonable — not merely enacted by Parliament (Maneka Gandhi 1978 overruling AK Gopalan).' },

{ cat:'Constitutional', keywords:['basic structure','kesavananda','constitutional amendment','parliament limit'],
  q:'What is the Basic Structure doctrine?',
  a:'Propounded by a 13-judge bench (7:6 majority) in <strong><em>Kesavananda Bharati v State of Kerala (1973) 4 SCC 225</em></strong>: Parliament can amend ANY part of the Constitution under Article 368 but CANNOT alter its <em>basic structure</em>. Elements include (not exhaustive): supremacy of the Constitution, republic + democratic form, secular character, separation of powers, federal structure, judicial review, rule of law, fundamental rights, unity and integrity. Applied to strike down:<br/>• 42nd Amendment clause excluding judicial review (<em>Minerva Mills v Union of India 1980</em>)<br/>• NJAC (National Judicial Appointments Commission) — struck down in <em>Supreme Court Advocates-on-Record Association v Union of India 2016</em><br/>Even a constitutional amendment creating an irrevocable majority would fail.' },

{ cat:'Constitutional', keywords:['writ','habeas corpus','mandamus','certiorari','article 32','article 226'],
  q:'What are the five writs and when are they issued?',
  a:'Under Articles 32 (SC) and 226 (HC):<br/>(1) <strong>Habeas Corpus</strong> ("produce the body"): Challenges illegal detention. Most urgent — courts issue on same day. No locus standi restriction — any person may file. SC can issue even during emergency except in national emergency (Article 359).<br/>(2) <strong>Mandamus</strong> ("we command"): Compels a public authority to perform a <em>public duty</em>. Cannot issue against private persons or for discretionary acts.<br/>(3) <strong>Prohibition</strong>: Issued to inferior court/tribunal to prevent it from exceeding jurisdiction — operates <em>before</em> the act.<br/>(4) <strong>Certiorari</strong>: Quashes an order already passed by inferior court/tribunal for excess of jurisdiction, breach of natural justice, or error of law on the face of record — operates <em>after</em> the act.<br/>(5) <strong>Quo Warranto</strong>: Challenges a person\'s right to hold a public office. Available to any citizen even without personal interest.' },

// ══════════════════════════════════════════════════════════
// PROPERTY & TRANSFER
// ══════════════════════════════════════════════════════════
{ cat:'Property Law', keywords:['transfer of property','tpa','sale deed','property transfer','section 54'],
  q:'What are the key provisions of the Transfer of Property Act?',
  a:'<strong>Transfer of Property Act 1882 (TPA)</strong>:<br/>• <strong>Section 5</strong>: Transfer = conveyance of property from living person to living person (inter vivos — not succession).<br/>• <strong>Section 54</strong>: Sale of immovable property > ₹100 must be by registered document. Oral sale of property > ₹100 is invalid. Distinction between agreement to sell and actual sale: agreement to sell creates only personal rights; sale transfers ownership.<br/>• <strong>Section 58</strong>: Mortgage — transfer of interest in specific immovable property as security for money. Types: simple, mortgage by conditional sale, usufructuary, English, equitable, anomalous.<br/>• <strong>Section 105</strong>: Lease — transfer of right to enjoy property for a time or perpetually for consideration (rent). Lease > 1 year: compulsory registration.<br/>• <strong>Section 122</strong>: Gift — transfer without consideration, must be accepted by donee, cannot be revoked except for specific grounds (Section 126).' },

// ══════════════════════════════════════════════════════════
// CONSUMER LAW
// ══════════════════════════════════════════════════════════
{ cat:'Consumer Law', keywords:['consumer complaint','consumer court','district commission','cpa 2019'],
  q:'How do I file a consumer complaint under the Consumer Protection Act 2019?',
  a:'<strong>CPA 2019 — jurisdiction</strong>:<br/>• District Consumer Commission: claims up to ₹50 lakh<br/>• State Consumer Commission: ₹50 lakh – ₹2 crore<br/>• NCDRC: above ₹2 crore<br/>Procedure: (1) Optional legal notice first (practical step); (2) File on <strong>e-daakhil.nic.in</strong> (mandatory for all Commissions now) or physically; (3) Attach: bills, receipts, warranty card, communication; (4) Nominal filing fee (₹200–₹7,500 depending on value); (5) Commission admits and serves notice; (6) Mandatory mediation attempt (Section 37); (7) Evidence and arguments; (8) Remedies: replacement, refund, compensation, punitive damages (up to ₹10 lakh for intentional unfair trade practice). Limitation: <strong>2 years from cause of action</strong> — but Section 69(2) allows condonation with valid reasons. Complaint can be filed by consumer, recognised consumer association, or Central/State Government.' },

]; // end BOT_KB

let _botCurrentCat = null;

// ── Enable/disable ────────────────────────────────────────────────────────
function isChatbotEnabled(){
  return localStorage.getItem('ld_chatbot_enabled') !== 'false';
}
function setChatbotEnabled(val){
  localStorage.setItem('ld_chatbot_enabled', String(val));
  if(val) renderChatbotButton();
  else {
    document.getElementById('chatbot-btn')?.remove();
    document.getElementById('chatbot-panel')?.remove();
    _botOpen = false;
  }
}

// ── Init / 2-day clear ────────────────────────────────────────────────────
function initChatbot(){
  if(!isChatbotEnabled()) return;
  const lastDate = localStorage.getItem(BOT_DATE);
  if(!lastDate || Date.now()-parseInt(lastDate) > 2*86400000){
    localStorage.removeItem(BOT_KEY);
    localStorage.setItem(BOT_DATE, String(Date.now()));
  }
  renderChatbotButton();
}

// ── Floating button ───────────────────────────────────────────────────────
function renderChatbotButton(){
  if(document.getElementById('chatbot-btn')) return;
  const btn = document.createElement('div');
  btn.id = 'chatbot-btn';
  btn.innerHTML = `<i class="fas fa-balance-scale" style="font-size:18px;"></i>`;
  btn.title = 'LexDesk Assistant';
  Object.assign(btn.style, {
    position:'fixed', bottom:'24px', right:'24px', zIndex:'8888',
    width:'50px', height:'50px', borderRadius:'50%',
    background:'rgba(4,8,22,0.90)', border:'2px solid var(--gold)',
    color:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center',
    cursor:'pointer', boxShadow:'0 4px 20px rgba(0,0,0,.40), 0 0 0 4px rgba(212,168,67,.08)',
    backdropFilter:'blur(20px)', userSelect:'none', transition:'transform .15s, box-shadow .15s',
  });
  btn.onmouseover = ()=>{ btn.style.transform='scale(1.08)'; btn.style.boxShadow='0 6px 28px rgba(0,0,0,.50), 0 0 0 6px rgba(212,168,67,.14)'; };
  btn.onmouseout  = ()=>{ btn.style.transform=''; btn.style.boxShadow='0 4px 20px rgba(0,0,0,.40), 0 0 0 4px rgba(212,168,67,.08)'; };
  makeBotDraggable(btn);
  document.body.appendChild(btn);
}

function makeBotDraggable(el){
  let sx,sy,ex,ey,dragging=false,moved=false;
  el.addEventListener('pointerdown',e=>{
    dragging=true; moved=false;
    sx=e.clientX; sy=e.clientY;
    ex=parseInt(el.style.right)||24; ey=parseInt(el.style.bottom)||24;
    e.preventDefault();
  });
  window.addEventListener('pointermove',e=>{
    if(!dragging)return;
    const dx=sx-e.clientX, dy=sy-e.clientY;
    if(Math.abs(dx)+Math.abs(dy)>6) moved=true;
    el.style.right  = Math.max(0,ex+dx)+'px';
    el.style.bottom = Math.max(0,ey+dy)+'px';
    const p=document.getElementById('chatbot-panel');
    if(p){ p.style.right=el.style.right; p.style.bottom=(parseInt(el.style.bottom)+58)+'px'; }
  });
  window.addEventListener('pointerup',()=>{ dragging=false; });
  el.addEventListener('click',e=>{
    if(moved){moved=false;return;}
    toggleChatbot();
  });
}

let _botOpen=false;
function toggleChatbot(){
  const p=document.getElementById('chatbot-panel');
  if(p){p.remove();_botOpen=false;}else{openChatbot();_botOpen=true;}
}

// ── Open chat panel ───────────────────────────────────────────────────────
function openChatbot(){
  if(document.getElementById('chatbot-panel')) return;
  _botCurrentCat=null;
  const history=JSON.parse(localStorage.getItem(BOT_KEY)||'[]');
  const btn=document.getElementById('chatbot-btn');
  const bR=parseInt(btn?.style.right)||24;
  const bB=parseInt(btn?.style.bottom)||24;

  const panel=document.createElement('div');
  panel.id='chatbot-panel';
  Object.assign(panel.style,{
    position:'fixed', bottom:(bB+58)+'px', right:bR+'px',
    zIndex:'8889', width:'340px', maxHeight:'520px',
    borderRadius:'16px', overflow:'hidden', display:'flex', flexDirection:'column',
  });

  const cats=[...new Set(BOT_KB.map(k=>k.cat))];
  const totalQ=BOT_KB.length;

  panel.innerHTML=`
    <!-- Header -->
    <div style="padding:13px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;
         border-bottom:1px solid rgba(255,255,255,.10);">
      <div style="width:32px;height:32px;border-radius:50%;flex-shrink:0;
           display:flex;align-items:center;justify-content:center;
           background:rgba(212,168,67,.18);border:1px solid rgba(212,168,67,.35);">
        <i class="fas fa-balance-scale" style="font-size:13px;color:var(--gold);"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:13.5px;line-height:1;">LexDesk Assistant</div>
        <div style="font-size:10.5px;opacity:.40;margin-top:2px;">${totalQ} Q&amp;As · Indian Law &amp; System</div>
      </div>
      <button onclick="toggleChatbot()"
        style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);
               color:rgba(255,255,255,.55);width:28px;height:28px;border-radius:7px;
               cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;
               line-height:1;">&times;</button>
    </div>

    <!-- Messages -->
    <div id="bot-messages" style="flex:1;overflow-y:auto;padding:14px 12px;
      display:flex;flex-direction:column;gap:9px;
      scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.08) transparent;">
      ${history.length
        ? history.map(m=>renderBotBubble(m)).join('')
        : renderBotBubble({role:'bot',content:'Hi! I can help you <strong>use LexDesk</strong> or answer <strong>Indian law questions</strong> — BNS, GST, Companies Act, Family Law, and more.<br/><br/>Type a question or pick a topic below.'})}
    </div>

    <!-- Quick-pick category chips -->
    <div id="bot-chips" style="padding:6px 10px;display:flex;flex-wrap:wrap;gap:5px;
         border-top:1px solid rgba(255,255,255,.08);max-height:90px;overflow-y:auto;">
      ${cats.map(cat=>`
        <button onclick="botShowCategory('${escHtml(cat)}')"
          style="padding:4px 11px;border-radius:20px;font-size:11px;cursor:pointer;
                 background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
                 color:rgba(255,255,255,.60);transition:all .13s;white-space:nowrap;"
          onmouseover="this.style.background='rgba(255,255,255,.15)';this.style.color='#fff'"
          onmouseout="this.style.background='rgba(255,255,255,.07)';this.style.color='rgba(255,255,255,.60)'"
        >${cat}</button>`).join('')}
    </div>

    <!-- Input -->
    <div style="padding:10px 10px;border-top:1px solid rgba(255,255,255,.08);flex-shrink:0;">
      <div style="display:flex;gap:7px;align-items:center;">
        <input id="bot-input" type="text" placeholder="Ask anything…"
          style="flex:1;padding:9px 14px;border-radius:22px;font-size:13px;outline:none;
                 background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.13);
                 color:#dde6ff;"
          onfocus="this.style.borderColor='var(--gold)'"
          onblur="this.style.borderColor='rgba(255,255,255,.13)'"
          onkeydown="if(event.key==='Enter')botSend()"/>
        <button onclick="botSend()"
          style="width:36px;height:36px;border-radius:50%;flex-shrink:0;cursor:pointer;border:none;
                 background:linear-gradient(135deg,var(--gold),#b8872a);
                 color:#0d0d0d;font-size:13px;font-weight:700;display:flex;align-items:center;
                 justify-content:center;">
          <i class="fas fa-arrow-up"></i>
        </button>
      </div>
    </div>`;

  document.body.appendChild(panel);
  document.getElementById('bot-messages').scrollTop=9999;
  setTimeout(()=>document.getElementById('bot-input')?.focus(),80);
}


function botCategoryGrid(cats){
  if(!cats) cats=[...new Set(BOT_KB.map(k=>k.cat))];
  let html='<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:4px 0;">';
  cats.forEach(cat=>{
    const count=BOT_KB.filter(k=>k.cat===cat).length;
    html+=`<button onclick="botShowCategory('${escHtml(cat)}')"
      style="display:flex;align-items:center;justify-content:space-between;gap:6px;
             background:var(--glass);border:1px solid var(--border);
             border-radius:9px;padding:7px 10px;font-size:12px;cursor:pointer;
             color:var(--text-secondary);text-align:left;"
      onmouseover="this.style.background='var(--glass-hi)'"
      onmouseout="this.style.background='var(--glass)'">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(cat)}</span>
      <span style="font-size:10px;color:var(--text-muted);flex-shrink:0;">${count}</span>
    </button>`;
  });
  html+='</div>';
  return html;
}

function botShowCategory(cat){
  _botCurrentCat=cat;
  const chips=document.getElementById('bot-chips');
  if(!chips) return;
  const items=BOT_KB.filter(k=>k.cat===cat);
  chips.innerHTML=`
    <button onclick="botBackToCategories()"
      style="padding:4px 10px;border-radius:20px;font-size:11px;cursor:pointer;
             background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
             color:rgba(255,255,255,.55);display:flex;align-items:center;gap:5px;white-space:nowrap;">
      <i class="fas fa-arrow-left" style="font-size:9px;"></i> Back
    </button>
    ${items.map((item,i)=>`
      <button data-idx="${BOT_KB.indexOf(item)}"
        onclick="botAnswer('${escHtml(cat)}',parseInt(this.dataset.idx))"
        style="padding:4px 11px;border-radius:20px;font-size:11px;cursor:pointer;
               background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
               color:rgba(255,255,255,.60);transition:all .13s;white-space:nowrap;"
        onmouseover="this.style.background='rgba(255,255,255,.15)';this.style.color='#fff'"
        onmouseout="this.style.background='rgba(255,255,255,.07)';this.style.color='rgba(255,255,255,.60)'"
        >${escHtml(item.q)}</button>`).join('')}`;
}



function botBackToCategories(){
  _botCurrentCat=null;
  const area=document.getElementById('bot-question-area');
  if(area) area.innerHTML=botCategoryGrid();
  const inp=document.getElementById('bot-input');
  if(inp) inp.value='';
}

function renderBotBubble(m){
  const isMine=m.role==='user';
  const isLight=document.documentElement.getAttribute('data-theme')==='light';
  const userBg   = isLight ? 'rgba(0,0,0,.75)' : 'rgba(212,168,67,.20)';
  const userColor= '#fff';
  const botBg    = isLight ? 'rgba(255,255,255,.80)' : 'rgba(255,255,255,.09)';
  const botColor = isLight ? '#0d1526' : '#e8eeff';
  const botBorder= isLight ? '1px solid rgba(0,0,0,.09)' : '1px solid rgba(255,255,255,.11)';
  return `<div style="display:flex;flex-direction:column;align-items:${isMine?'flex-end':'flex-start'};">
    <div style="max-width:88%;padding:9px 13px;word-break:break-word;
      border-radius:${isMine?'16px 16px 4px 16px':'16px 16px 16px 4px'};
      background:${isMine?userBg:botBg};
      color:${isMine?userColor:botColor};
      font-size:13px;line-height:1.60;
      ${!isMine?`border:${botBorder};`:''}">${m.content}</div>
  </div>`;
}

function botAddMessage(role,content){
  const msgs=document.getElementById('bot-messages');
  if(!msgs)return;
  document.getElementById('bot-question-area')?.querySelectorAll('.bot-suggestions')?.forEach(el=>el.remove());
  msgs.insertAdjacentHTML('beforeend',renderBotBubble({role,content}));
  msgs.scrollTop=msgs.scrollHeight;
  const history=JSON.parse(localStorage.getItem(BOT_KEY)||'[]');
  history.push({role,content});
  if(history.length>80) history.splice(0,history.length-80);
  localStorage.setItem(BOT_KEY,JSON.stringify(history));
}

function botShowTyping(){
  const msgs=document.getElementById('bot-messages');
  if(!msgs)return;
  const el=document.createElement('div');
  el.id='bot-typing'; el.style.cssText='display:flex;align-items:center;gap:4px;padding:8px 13px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10);border-radius:16px 16px 16px 4px;width:fit-content;';
  el.innerHTML='<span style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.35);animation:botdot 1.2s infinite;"></span><span style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.35);animation:botdot 1.2s .2s infinite;"></span><span style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.35);animation:botdot 1.2s .4s infinite;"></span>';
  msgs.appendChild(el); msgs.scrollTop=msgs.scrollHeight;
  if(!document.getElementById('bot-anim-style')){
    const s=document.createElement('style'); s.id='bot-anim-style';
    s.textContent='@keyframes botdot{0%,80%,100%{transform:scale(.7);opacity:.4}40%{transform:scale(1);opacity:1}}';
    document.head.appendChild(s);
  }
}
function botHideTyping(){ document.getElementById('bot-typing')?.remove(); }

function botFindAnswer(query){
  const q=query.toLowerCase();
  let best=null, bestScore=0;
  BOT_KB.forEach(entry=>{
    let score=0;
    entry.keywords.forEach(kw=>{ if(q.includes(kw)) score+=3; else { kw.split(' ').forEach(w=>{ if(w.length>3&&q.includes(w)) score+=1; }); } });
    entry.q.toLowerCase().split(/\W+/).filter(w=>w.length>3).forEach(w=>{ if(q.includes(w)) score+=1; });
    if(score>bestScore){bestScore=score;best=entry;}
  });
  return bestScore>=2?best:null;
}

function botSend(){
  const inp=document.getElementById('bot-input');
  const text=(inp?.value||'').trim();
  if(!text)return;
  inp.value='';
  botAskQuestion(text);
}

function botAskQuestion(query){
  botAddMessage('user',escHtml(query));
  botShowTyping();
  setTimeout(()=>{
    botHideTyping();
    const match=botFindAnswer(query);
    if(match){
      botAddMessage('bot',match.a);
      const related=BOT_KB.filter(e=>e!==match&&e.cat===match.cat).slice(0,3);
      if(related.length){
        const msgs=document.getElementById('bot-messages');
        if(msgs){
          const div=document.createElement('div');
          div.className='bot-suggestions';
          div.style.cssText='display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;';
          let chipHtml='';
          related.forEach(r=>{
            const ridx=BOT_KB.indexOf(r);
            chipHtml+=`<button data-cat="${escHtml(r.cat)}" data-idx="${ridx}"
              onclick="botAnswer(this.dataset.cat,parseInt(this.dataset.idx))"
              style="background:var(--glass);border:1px solid var(--border);
                     border-radius:16px;padding:4px 11px;font-size:11px;cursor:pointer;color:var(--text-muted);"
              onmouseover="this.style.background='var(--glass-hi)'"
              onmouseout="this.style.background='var(--glass)'"
              >${escHtml(r.q)}</button>`;
          });
          div.innerHTML=chipHtml;
          msgs.appendChild(div);
          msgs.scrollTop=msgs.scrollHeight;
        }
      }
    } else {
      const tokens=query.toLowerCase().split(/\W+/).filter(w=>w.length>2);
      const candidates=BOT_KB.filter(e=>tokens.some(t=>e.keywords.some(kw=>kw.includes(t))||e.q.toLowerCase().includes(t))).slice(0,4);
      if(candidates.length){
        botAddMessage('bot','I didn\'t catch that exactly. Did you mean one of these?');
        const msgs=document.getElementById('bot-messages');
        if(msgs){
          const div=document.createElement('div');
          div.style.cssText='display:flex;flex-direction:column;gap:5px;margin-top:4px;';
          let candHtml='';
          candidates.forEach(r=>{
            const ridx=BOT_KB.indexOf(r);
            candHtml+=`<button data-cat="${escHtml(r.cat)}" data-idx="${ridx}"
              onclick="botAnswer(this.dataset.cat,parseInt(this.dataset.idx))"
              style="text-align:left;background:var(--glass);border:1px solid var(--border);
                     border-radius:9px;padding:7px 10px;font-size:12.5px;cursor:pointer;
                     color:var(--text-secondary);width:100%;margin-bottom:4px;"
              onmouseover="this.style.background='var(--glass-hi)'"
              onmouseout="this.style.background='var(--glass)'">${escHtml(r.q)}</button>`;
          });
          div.innerHTML=candHtml;
          msgs.appendChild(div);
          msgs.scrollTop=msgs.scrollHeight;
        }
      } else {
        botAddMessage('bot',`I don\'t have a specific answer for that yet.<br/>Try browsing by category, or rephrase — e.g. "bail under BNSS", "GST on legal services", "create a client".`);
        const area=document.getElementById('bot-question-area');
        if(area) area.innerHTML=botCategoryGrid();
      }
    }
  },500+Math.random()*400);
}

function botAnswer(cat,idx){
  const item=BOT_KB[idx];
  if(!item) return;
  botAddMessage('user',escHtml(item.q));
  botShowTyping();
  setTimeout(()=>{
    botHideTyping();
    botAddMessage('bot',item.a);
    // Offer 2-3 related questions as chips
    const related=BOT_KB.filter(e=>e!==item&&e.cat===item.cat).slice(0,3);
    if(related.length){
      const msgs=document.getElementById('bot-messages');
      if(msgs){
        const div=document.createElement('div');
        div.style.cssText='display:flex;flex-wrap:wrap;gap:5px;margin-top:3px;';
        div.innerHTML=related.map(r=>`
          <button data-idx="${BOT_KB.indexOf(r)}" data-cat="${escHtml(r.cat)}"
            onclick="botAnswer(this.dataset.cat,parseInt(this.dataset.idx))"
            style="padding:4px 10px;border-radius:16px;font-size:10.5px;cursor:pointer;
                   background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.11);
                   color:rgba(255,255,255,.55);"
            onmouseover="this.style.background='rgba(255,255,255,.14)';this.style.color='#fff'"
            onmouseout="this.style.background='rgba(255,255,255,.07)';this.style.color='rgba(255,255,255,.55)'"
          >${escHtml(r.q)}</button>`).join('');
        msgs.appendChild(div);
        msgs.scrollTop=msgs.scrollHeight;
      }
    }
    // Reset chips to categories
    if(!_botCurrentCat) botBackToCategories();
  },400+Math.random()*300);
}
