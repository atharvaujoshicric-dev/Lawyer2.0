# LexDesk — Business Model

## What you're selling

A legal practice management SaaS purpose-built for Indian solo
practitioners and small-to-mid law firms (2 to 50 lawyers): client and
case management, document storage, court deadline tracking pre-seeded
with Indian statutes, team task workflow, internal chat, fee ledger and
invoicing, a client self-service portal, and an Indian-law-aware
assistant chatbot. Differentiated from generic CRM and practice
management tools (Clio, MyCase, PracticePanther — all built for
US/UK law) by being natively built around BNS, BNSS, CPC, GST deadlines
and Indian billing practices, at India-appropriate pricing.

---

## 1. Target market

### Primary: solo practitioners and small firms (1-10 lawyers)
The largest segment of the Indian bar by headcount, and the most
underserved by existing tools — most run their practice on WhatsApp,
Excel, and physical case files. Price-sensitive but high in volume.
India has roughly 1.5-2 million enrolled advocates; even capturing 0.1%
of that base (1,500-2,000 firms) at modest pricing is a meaningful
business.

### Secondary: mid-size firms (10-50 lawyers)
Fewer in number, but materially higher willingness to pay, more seats
per account, and value the team-hierarchy, custom-roles, and task
workflow features that solo practitioners don't need. Sales cycle is
longer (multiple decision-makers) but lifetime value is much higher.

### Tertiary (later): corporate legal departments, LPOs
Not the initial focus — different feature needs (matter budgets,
outside-counsel management, more complex approval chains) — but the
multi-tenant architecture means this is a plausible expansion path
without a re-platform.

---

## 2. Pricing

Indian SaaS buyers, especially solo practitioners, respond better to
simple, low-friction pricing than complex usage-based metering. Three
tiers, monthly or annual, with the annual option priced at roughly two
months free versus paying monthly.

**Solo** — for the individual practitioner. ₹999/month or ₹9,990/year.
One seat, 2 GB storage, unlimited clients and cases, the 18 pre-seeded
court deadline rules plus the ability to add custom ones, the client
portal, and the AI legal assistant chatbot. No team chat or custom
roles, since there's no team. Email support with a 48-hour response
target.

**Team** — for firms with multiple lawyers. ₹699 per user per month
(minimum 3 users) or ₹6,990 per user per year. 20 GB storage, everything
in Solo, plus team chat and group messaging, custom roles and
permissions, and a 99.5% uptime SLA. Email support with a 24-hour
response target.

**Enterprise** — for larger firms and corporate legal departments.
Custom pricing, negotiated storage, white-label and custom domain
options, SSO/SCIM, and a dedicated support contact with same-day
response. Enterprise is intentionally unpriced publicly so it qualifies
leads into a sales conversation rather than self-serve, which is
appropriate once deal size justifies a real sales process.

A 14-day free trial runs on Team-tier features regardless of which plan
the prospect ultimately intends to buy, so they see the full product
before either downgrading to Solo or staying on Team — this increases
upgrade conversion versus trialing only the entry tier. No credit card
is required to start a trial.

### Why these price points

₹999/month for solo practitioners sits below what a part-time clerk
costs and below most western tools' India pricing after currency
conversion — Clio starts around $39/month, which is roughly ₹3,200/month
for a single user. LexDesk at under a third of that price, with
Indian-law-specific value the western tools simply don't have, is a
clear wedge into the market.

₹699 per user per month for Team undercuts per-seat enterprise tools
while still yielding healthy margins, given the near-zero marginal cost
per additional tenant on shared Supabase infrastructure (see the unit
economics below). Enterprise stays unpriced publicly and becomes a sales
conversation once deal size justifies it.

---

## 3. Unit economics

Infrastructure cost is dominated by Supabase, and barely moves with
tenant count until the platform reaches hundreds of paying firms — this
is the entire point of true multi-tenancy, as discussed in
database/README.md. With roughly 1 to 20 firms on the platform, the
Supabase free tier covers everything at zero infrastructure cost. From
20 to 100 firms, the Pro tier at $25/month works out to roughly
$0.25-1.25 per firm. From 100 to 500 firms, Pro plus a storage add-on
runs about $75/month, or $0.15-0.75 per firm. From 500 to 2,000 firms,
the Team tier at roughly $599/month works out to $0.30-1.20 per firm.

At even 50 firms on the Solo plan (₹999/month, roughly $12), monthly
revenue is around $600 against roughly $25 in infrastructure cost —
gross margin north of 95%. This is the core economic argument for the
multi-tenant architecture: a separate-Supabase-per-firm model (the
alternative explicitly ruled out earlier in this project) would instead
cost roughly $0-25/month per firm depending on usage, destroying margin
at exactly the volume where a SaaS business becomes attractive.

For customer acquisition cost, target under three months of revenue per
customer — roughly ₹3,000 for Solo or ₹6,000 for a 3-seat Team account.
This is achievable primarily through the low-CAC channels below rather
than paid advertising, which tends to run expensive for "law firm
software" search terms.

---

## 4. Go-to-market

**Bar Association partnerships.** India's state Bar Councils and local
Bar Associations are natural distribution: propose a group discount,
around 20% off Solo or Team, for association members, in exchange for
being listed as a recommended tool or getting a demo slot at a CLE or
member event. Low cost, high trust transfer — a recommendation from a
lawyer's own Bar Association carries far more weight than a cold ad.

**Content marketing targeting Indian legal-tech search.** The chatbot's
knowledge base — BNS/BNSS, GST on legal services, IBC, POSH, and so on —
is also a content goldmine. Publishing each topic as a blog post ("What
changed with BNSS 2023?", "GST on legal services explained") optimized
for the searches solo practitioners and young lawyers actually run
compounds over time: it's both top-of-funnel acquisition and product
demonstration, since the same content lives inside the product as the
chatbot.

**Law college outreach.** Final-year LLB students and young associates
are far more willing to try new tools than senior partners, and many
will go on to start their own practice within a few years. A
free or discounted student tier, or simply generous trial extensions
for college email domains, seeds future adopters cheaply.

**Direct outreach to small firms.** Manual and doesn't scale, but works
for the first 50-100 customers — LinkedIn and email outreach to solo
practitioners and small-firm partners, offering a personal onboarding
call. This phase also generates the qualitative feedback that should
shape the roadmap before scaling spend on any one channel.

**Referral program.** Once there are roughly 50 active paying firms, a
simple "refer a firm, both get a month free" program works well —
legal practice is a relationship-driven profession, and lawyers talk to
other lawyers constantly at bar association events, in court corridors,
and in WhatsApp groups for specific practice areas.

---

## 5. Competitive positioning

Compared to Clio, MyCase, and PracticePanther, LexDesk is built natively
for Indian law with BNS, BNSS, GST, and IBC awareness baked in, priced
in rupees at India-appropriate levels, and ships with pre-seeded Indian
statute deadline rules out of the box — none of which the US/UK-centric
incumbents offer, since India is a small fraction of their addressable
market and not worth building for.

Compared to generic CRM tools like Zoho, LexDesk offers a purpose-built
client portal and an AI assistant trained specifically on Indian legal
domains, where a generic CRM offers neither in any legal-specific way.

The wedge is narrow and defensible: Indian-law-native functionality
combined with India-appropriate pricing is not something the established
international players will prioritize building, and it's not something
a generic CRM vendor would ever build at all. This is a classic
underserved-vertical SaaS play.

---

## 6. Revenue projections (illustrative, conservative)

By month 3, a reasonable target is 10 paying firms at an average revenue
of around ₹1,200 each, putting monthly recurring revenue near ₹12,000
(roughly $145), an annualized run-rate around $1,740. By month 6, with
40 paying firms averaging ₹1,500, monthly recurring revenue reaches
roughly ₹60,000 ($720), an annualized run-rate near $8,640. By month 12,
150 firms averaging ₹1,800 puts monthly recurring revenue around
₹270,000 ($3,250), an annualized run-rate near $39,000. By month 24,
500 firms averaging ₹2,200 — reflecting a growing mix of higher-value
Team accounts — puts monthly recurring revenue around ₹1,100,000
($13,250), an annualized run-rate near $159,000.

These figures assume a mix shifting toward Team plans over time as
multi-lawyer firms adopt, and modest month-over-month growth of roughly
15-20%, achievable through the channels above without large paid
acquisition spend. Treat these as directional rather than a forecast —
the real numbers depend entirely on execution of the go-to-market
channels above and the actual product-market fit signal from early
customers.

---

## 7. Key risks

**Trust barrier for cloud storage of client data.** Lawyers correctly
worry about confidentiality. Mitigate with clear data residency
messaging — Supabase's ap-south-1 region keeps data within India — a
published security page summarizing the Row Level Security architecture
in plain language, and eventually a SOC 2 or ISO 27001 certification
once revenue justifies the cost.

**Slow professional-services sales cycles**, especially for the
Enterprise tier and mid-size firms — budget for a longer runway than a
typical B2C-adjacent SaaS would need.

**Regulatory drift.** Indian law changes, as the BNS/BNSS/BSA transition
just demonstrated. The chatbot content and deadline-rule seed data need
periodic review to stay accurate; stale legal content damages trust in a
legal-vertical product more severely than in almost any other software
category.

**Competitive response.** If an established player, even a generalist
Indian CRM vendor, decides to build India-specific legal features, the
wedge narrows. The counter is to deepen the Indian-law specificity —
more statutes, state-specific rules, vernacular language support —
faster than a generalist competitor would bother to.
