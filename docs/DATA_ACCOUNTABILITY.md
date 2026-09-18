# Atlas Data Accountability System

How Atlas keeps its numbers honest. This is the operating contract for every
data change in this project — written 2026-09-18 after a full independent
audit found 56 corrections across the dataset (stale figures, wrong dates,
one wrongly-summed $205B). The system exists so that class of error gets
caught by process, not by luck.

## 1. Provenance — every figure carries its papers

No figure enters the dataset without all four:

| Field | Meaning | Example |
|---|---|---|
| `value` | The figure itself | `"$6.5B"` |
| `source` | The specific primary document | `"Broadcom Q4/FY2025 earnings call (CEO Hock Tan)"` |
| `asOf` | When the figure was true | `"Q4 FY2025, ended 2025-11-02"` |
| `tier` | Evidence tier (below) | `"disclosed"` |

`"press"` alone is never a source. Name the outlet *and* the document:
`"Reuters, 2025-12-30"` beats `"press"`. A figure whose source can't be named
stays `null` with tier `unsourced` — it is never invented.

## 2. Tier discipline

Tiers are defined in `src/data/config.json` (`sourceTiers`). The rule is simple:

- **reported** — straight from an SEC filing (10-K, 10-Q, 8-K, 20-F). Strongest.
- **disclosed** — official, but via an unofficial channel (earnings call,
  press release, company blog).
- **estimated** — third-party or calculated. Must show the math or the
  third party in a `note`.
- **inferred** — deduced, not stated. Must show the reasoning in a `note`.
- **unsourced** — no figure yet. Displayed as "not yet sourced," never as a number.

An estimate is never presented as reported. If the UI shows a tier badge,
the badge must match the evidence.

## 3. The Triple-Check Protocol

Run before finalizing any data change. All three passes, every time:

**Pass 1 — Source check.** The primary source is open in front of me. The
figure in the file matches the source exactly (units, GAAP vs non-GAAP,
fiscal vs calendar). The `asOf` matches the source's reporting period.

**Pass 2 — Name & arithmetic check.** Company and product names match the
source's official naming (no invented tickers, no wrong legal entities).
Every derived figure (growth rates, margins, sums) is recomputed from the
source inputs — never copied from the file's existing math. Percentages are
recomputed, not trusted.

**Pass 3 — Consistency check.** The ISO `date` matches the `displayDate`
(the audit's most common bug). The same fact stated in two files agrees
(timeline figure vs financing amount, KPI "latest quarter" vs revenue series).
No placeholder days: a date is the true day or the 1st of the month, never a
mid-month guess. New claims get a source before they're written; anything
unsourceable stays `null`.

## 4. The Two-Person Rule

No figure goes live from a single pass. The workflow:

1. **Sourcing pass** — figures collected and entered with full provenance.
2. **Verification pass** — an independent checker (a fresh session with no
   memory of the sourcing pass, or Claude Code) spot-checks the batch against
   primary sources. Corrections come back; they get applied, not argued with.
3. **Apply + log** — corrections applied, update-log entry written (below).

The 2026-09-18 audit proved why: the auditor itself overcalled one item
(Stargate "~7 GW" marked unverifiable — it was real, just mis-scoped), and
only the second pair of eyes caught it.

## 5. Freshness policy

Every data file carries a freeze reference (`updated` / `asOf`). Figures
labeled "latest quarter" must be within one reporting cycle of the freeze
date. `npm run validate` prints a data-health report (see §7); any file
whose freeze is older than ~120 days raises a staleness warning. Staleness
was the single biggest error class in the audit — this catches it by
construction.

## 6. The Update Log — game-patch style

`UPDATES.md` (repo root) is the versioned record of every data-affecting
change, written like game patch notes: **Update vN — "Name" — date**, with
sections for Added / Corrected / Removed / Verification. Every entry records
what changed, why, and who verified it. When in doubt about what a number
used to be, or why it changed, the update log is the first place to look.

## 7. Automated health checks

`npm run validate` runs the structural checks (valid JSON, required fields,
ticker/layer/category references, tier values) as hard errors — the build
fails if they break. On top of that it prints a **Data Health** report:

- **Provenance coverage** per file — share of figures carrying source + tier.
- **Date consistency** — timeline ISO `date` vs `displayDate` mismatches.
- **Missing sources** — events or edges with no citable source.
- **Staleness** — files whose freeze date is aging out.

Health warnings don't fail the build (yet) — they're the dashboard. If a
warning sits unaddressed across two updates, it graduates to a hard error.

## 8. Commitments

- Never write a figure without a citable source.
- Never present an estimate as a reported figure.
- When unsure, it stays `null` and unsourced.
- When a sourced number turns out wrong: fix it, log it in `UPDATES.md`,
  say so plainly. No quiet edits.
- No liability theater: this system can't make a primary source correct,
  and it can't prevent every mistake. What it does is make errors rare,
  catchable, and traceable — which is what accountability actually looks
  like for data.
