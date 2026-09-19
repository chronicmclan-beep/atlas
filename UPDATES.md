# Atlas Update Log

Versioned patch notes for the Atlas dataset and site. Every data-affecting
change ships as a numbered update with a name — like game patch notes.
Format per update: **Update vN — "Name" — YYYY-MM-DD**, with Added /
Corrected / Removed / Verification sections. The full rules live in
`docs/DATA_ACCOUNTABILITY.md`.

---

## Update v1 — "Accountability System" — 2026-09-18
The update system itself. No data figures changed in this update.

### Added
- `docs/DATA_ACCOUNTABILITY.md` — the full accountability spec: provenance
  schema, tier discipline, the Triple-Check Protocol, the Two-Person Rule,
  freshness policy, and the update-log convention.
- `UPDATES.md` (this file) — the versioned patch-notes log.
- Data Health report in `npm run validate` (`scripts/validate-data.mjs`):
  provenance coverage per file, timeline date/displayDate consistency
  warnings, missing-source warnings, and freeze-date staleness warnings.

### Verification
- System spec reviewed against the 2026-09-18 audit findings; every error
  class the audit found (staleness, wrong dates, wrong arithmetic, summed
  instruments, unverifiable claims) maps to a specific check or rule above.
- `npm run validate` passes; `npm run build` unaffected (health items are
  warnings, not build-breakers, until baselined).

---

## Update v2 — "Verification Overhaul" — 2026-09-18

Applies the 56-item correction set from the 2026-09-18 independent accuracy
audit (report: `~/workspace/atlas-audit/VERIFICATION_REPORT.md`), with
Basudev's amendments. First update applied under the Data Accountability
System: Triple-Check Protocol run on every edit; Data Health warnings
reviewed (timeline date warnings went 7 → 0); `npm run validate`, lint,
tests, and production build all green.

### Corrected — Company KPIs (9)
- NVIDIA: FY2026 revenue growth +114% → **+65%** (recomputed from
  $215.938B / $130.497B); FCF $96.6B → **$96.7B** ($102.718B − $6.042B);
  diluted shares ~24.4B → **~24.5B** (24.514B diluted, not 24.359B basic).
- Broadcom: Q4 FY2025 AI semiconductor revenue $5.2B → **$6.5B**.
- Marvell: op cash flow $1.68B (mislabeled FY2025) → **$1.75B FY2026**;
  GAAP note rewritten — net income was **$2.67B** ($3.07 diluted EPS),
  boosted by a $1.83B sale-of-business gain.
- Arm: licensing revenue ~$1.4B → **$1.84B**; latest quarter $1.14B (stale
  Q2 FY2026) → **$1.289B, Q1 FY2027 (ended 2026-06-30), +22% YoY**.
- Arm "310B+ chips shipped" left unchanged — the audit's "350B+" replacement
  could not be confirmed in the FY2026 20-F; not asserting it (null-rule).

### Corrected — Revenue series (2)
- Broadcom Q1'26: null → **22.187** (was a data gap).
- File note rewritten: quarters are NOT calendar-aligned — NVIDIA reports
  fiscal quarters; Broadcom maps fiscal Qn → label Q(n−1)'yy (Nov year-end).

### Corrected — Supply chain (6)
- **Deleted** Hynix→AMD (no credible basis); **added** Samsung→AMD
  (HBM3E 12-Hi on MI350, reported).
- **Deleted** SMCI→AMZN (no credible evidence).
- Dell→MSFT kept with qualifier (no direct evidence; indirect via
  Nscale/IREN partnerships).
- ANET→MSFT retiered estimated → **reported** (Microsoft = 26% of Arista
  2025 revenue, Arista 10-K).
- NVDA→MSFT retiered reported → **estimated**: Customer A = ~22% of
  FY2026 revenue is reported (anonymized); the Microsoft attribution is
  inferred.
- NVDA→CRWV product clarified: chips flow **via OEM integrators**
  (CoreWeave S-1); direct sales not confirmed.

### Corrected — Financing web (6)
- **Split the wrongly-summed "up to $205B"** into its two real instruments:
  (1) up-to-$100B non-binding equity LOI (Sep 22, 2025, unrealized);
  (2) up-to-$105B contingent residual-value guarantee cap (8-K Aug 17,
  2026 — payable only on default/insolvency, indemnified by OpenAI,
  effective ~2028). New `guarantee` flow type.
- AVGO→Anthropic relabeled: capital is Apollo/Blackstone's, Broadcom is
  backstop (~$30B debt tranches); closed Jun 5, 2026.
- SoftBank→OpenAI: $30B direct + $11B syndicated (Reuters Dec 30, 2025);
  ~11% stake per some reports — unverified.
- MSFT→OpenAI: scoped as ~$13B+ cumulative incl. Jan 2023 ~$10B tranche.
- NVDA→CRWV stake: ~7% as of 2025 IPO filings; ~12% after the $2B
  follow-on purchase (Jan 26, 2026).
- NVIDIA 10-K equity-portfolio context figures removed — could not be
  reproduced from the filing; re-add only with citable line items.

### Corrected — Timeline (31)
- **22 date fixes**: 7 date/displayDate mismatches (Gemini, MI300X, o1,
  $4T, US-Intel, NVDA→OpenAI $100B, Stargate five sites) + 15 mid-month
  placeholder days replaced with true days (Claude launch, Colossus,
  OpenAI $6.6B, AMZN-Anthropic $8B, xAI $6B, Meta superclusters, GPT-5,
  AMD-OpenAI, Gulf chips, NVDA-Intel, OpenAI $122B, AVGO deal, TSMC
  capex, $500B platform, circular scrutiny).
- **9 content fixes**: Stargate ~7 GW rescoped (total planned Stargate
  capacity incl. Abilene/CoreWeave — auditor's "unverifiable" verdict was
  wrong); H20 refined (up-to-$5.5B announced charge, ~$4.5B booked in Q1);
  NVIDIA $3T → $3.34T; OpenAI $122B ($110B component was part of the
  round, not separate); Abilene reworded (1.2 GW planned, phase 1 H1
  2025); $500B platform = MOUs for third-party capital, not NVIDIA
  committing $500B; Ohio = capped guarantees, not financing; ChatGPT
  100M source → UBS estimate; $145B "gap" framing dropped;
  CoreWeave–Core Scientific marked **terminated Oct 30, 2025**.
- Data freeze bumped to 2026-09-18.

### Corrected — Glossary (1)
- CoreWeave IPO entry: NVIDIA stake 7% → **~12%** (after $2B follow-on,
  Jan 2026).

### Verification
- **Independently verified (Claude Code Opus spot-check, ~12 items):**
  the $205B split, NVDA +65%, Broadcom $6.5B, Arm $1.84B, CoreWeave ~12%,
  Core Scientific termination, Stargate dates, H20 $5.5B/$4.5B
  distinction, SoftBank $30B+$11B structure.
- **Audit single-pass (7-subagent primary-source pass), queued for second
  verification:** remaining date fixes, Marvell figures, Arm latest
  quarter, supply-edge retiering. No figure was invented; all replacements
  came from the audit's cited primary sources.
- Data Health dashboard: 0 warnings (was 7). Provenance coverage:
  timeline 100%, financing 100%, kpis 50%, supply 68%, revenue 40%.

---

## Update v4 — "The Missing Series" — 2026-09-18

Adds the Marvell and Arm quarterly revenue series to `revenue.json` —
the last "still to be ported" gap flagged in the file note. All figures
are GAAP totals from primary sources: company earnings releases and
SEC filings. No estimates, no aggregators.

### Added — Revenue series (2)
- **Marvell (MRVL):** 18 quarters, Q1'22–Q2'26, GAAP net revenue from
  **$1.447B** to **$2.739B**. Sources: investor.marvell.com quarterly
  earnings releases; 2026 quarters also furnished as 8-K Ex. 99.1.
  Fiscal mapping: FQn → Qn label (Jan year-end).
- **Arm (ARM):** 17 of 18 quarters, Q2'22–Q2'26, GAAP total revenue
  (license + royalty) from **$0.692B** to **$1.289B**. Sources: Arm
  newsroom earnings releases; SEC 6-Ks and 20-Fs. Fiscal mapping:
  FQ1 (Apr–Jun) → Q2 label (calendar-majority quarter).
- **Arm Q1'22 left null:** no primary quarterly disclosure exists for
  the Mar-2022 quarter (Arm was private). Not back-solved, not
  estimated — the null-rule applies.

### Corrected
- File note rewritten: documents the fiscal-quarter mapping conventions
  for Marvell and Arm (previously "still to be ported").

### Verification
- Triple-Check Protocol: every annual sum recomputed from the quarters —
  Marvell FY23 $5.920B / FY24 $5.508B / FY25 $5.767B / FY26 $8.195B;
  Arm FY23 $2.679B / FY24 $3.233B / FY25 $4.007B / FY26 $4.920B —
  all match the filed annuals exactly.
- Two-Person Rule: an independent verification pass re-checked all 35
  figures against their primary sources. One pre-publish correction:
  three Marvell FY25 quarter-end dates (amounts were already correct).
- Arm FY23 pre-IPO vs SEC discrepancy resolved: the SEC-filed recast
  series (post-September-2023 reorganization, retrospective adjustment)
  is used — it reconciles exactly to the audited $2.679B annual.
- `npm run validate`, lint, tests, production build all green.

---

## Update v3 — "Filling the Financials" — 2026-09-18

Populates the six company KPI records that were null + unsourced since
launch (the last big data gap: hyperscaler and neocloud financials).
All figures come from the companies' own Q4/FY earnings releases and
10-Ks on SEC EDGAR — no analyst estimates, no news-site numbers.
Data Health: kpis.json provenance 50% → **100%** (12/12 records sourced);
0 warnings.

### Added — Company KPIs (6 records × 8 metrics)
- **Microsoft (FY2026, ended Jun 30 2026):** revenue **$331.8B** (+18%);
  net income **$133.7B** (+31%); gross margin **67.9%** (computed);
  operating margin **46.8%** (computed); FCF **~$67.0B** (computed from
  OCF $182.9B − capex $115.9B); diluted EPS **$17.95**; **Azure >$100B**
  (first time, Nadella); Q4 **$90.0B** (+18%).
- **Oracle (FY2026, ended May 31 2026):** revenue **$67.4B** (+17%);
  net income **$17.0B** (+36%, to common shareholders); gross margin
  **65.8%** (computed); op margin **31%** ($20.6B GAAP); FCF **−$23.7B**
  (reported; AI datacenter buildout); EPS **$5.83**; OCI revenue
  **$18.1B** (+77%); Q4 **$19.2B** (+21%).
- **Amazon (FY2025):** revenue **$716.9B** (+12%); net income **$77.7B**
  (+31%); gross margin **50.3%** (computed); op margin **11.2%**
  (computed); FCF **$11.2B** TTM (company definition); EPS **$7.17**;
  **AWS $128.7B** (+20%); Q4 **$213.4B** (+14%); FY capex $131.8B.
- **Alphabet (FY2025):** revenue **$402.8B** (+15%); net income **$132.2B**
  (+32%); gross margin **59.7%** (computed); op margin **32%** ($129.0B
  GAAP); FCF **$73.3B** TTM; EPS **$10.81**; **Google Cloud $58.7B**
  (+36%); Q4 **$113.8B** (+18%); FY capex $91.4B.
- **Meta (FY2025):** revenue **$201.0B** (+22%); net income **$60.5B**
  (−3%, one-time tax charge); gross margin **82.0%** (computed);
  op margin **41%** ($83.3B GAAP); FCF **$43.6B**; EPS **$23.49**;
  **Reality Labs op loss −$19.2B** (revenue $2.2B); Q4 **$59.9B** (+24%).
- **CoreWeave (FY2025):** revenue **$5.13B** (+168%); net loss **−$1.17B**;
  gross margin **71.7%** (computed; infra opex sits below the line, not
  comparable to peers); op margin **−1%**; FCF **~−$7.3B** (implied);
  EPS **−$2.81**; **revenue backlog $66.8B**; Q4 **$1.57B** (+110%).

### Verification
- **Triple-Check Protocol:** all 48 metrics sourced from primary documents
  (earnings releases + 10-Ks); every computed margin/FCF recomputed by
  hand from reported inputs; fiscal periods, filing dates, and ticker
  labels cross-checked.
- **Two-Person Rule (independent adversarial verification, 48/48 CLEAN,
  0 discrepancies):** a second agent re-fetched every primary source and
  rechecked every value, tier, sign flag, and date. Confirmed: every
  "reported"-tier figure is stated verbatim; every "estimated"-tier figure
  recomputed correctly (incl. AMZN 50.3%, GOOGL 59.7%, META 82.0%, ORCL
  65.8%, CRWV 71.7% gross margins; MSFT ~$67.0B, CRWV ~−$7.3B FCF);
  all negative flags correct and complete (Oracle FCF, CoreWeave
  losses, Reality Labs). Known caveats recorded, no figure affected:
  Oracle gross margin rests on a COGS-definition choice (arithmetically
  correct as filed, honestly tiered); AMZN's EDGAR exhibit fetch failed
  but was verified against the verbatim official release text with
  EDGAR snippet confirmation.
- `npm run validate` passes (0 warnings), lint clean, 2/2 tests pass,
  production build succeeds.
