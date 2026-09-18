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
