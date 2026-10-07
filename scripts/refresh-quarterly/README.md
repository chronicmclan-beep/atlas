# EDGAR quarterly refresh

Automated quarterly-freshness checker for Atlas. Pulls the latest **quarterly**
revenue (plus net income and diluted EPS where tagged) for every ticker in
`src/data/kpis.json` directly from SEC EDGAR's XBRL `companyfacts` API — the
primary source, machine-readable — and compares each against the
"Latest quarter" figure currently in `kpis.json`.

**Report-only by default.** The script never edits data files. It produces:

- `reports/refresh-report-YYYYMMDD.json` — machine-readable results
- `reports/refresh-report-YYYYMMDD.md` — human-readable old → new table
- `reports/staging-quarterly-YYYYMMDD.json` — only with `--apply`; proposed
  `kpis.json` patches for human review, never auto-applied

## Usage

```sh
# Full run (all 63 tickers), report-only
python3 scripts/refresh-quarterly/edgar_refresh.py

# Limit to tickers
python3 scripts/refresh-quarterly/edgar_refresh.py --tickers NVDA,AMD,MU

# Also write the staging file with proposed patches
python3 scripts/refresh-quarterly/edgar_refresh.py --apply

# Offline test with fixtures (no network)
python3 scripts/refresh-quarterly/edgar_refresh.py \
  --facts-dir scripts/refresh-quarterly/tests/fixtures \
  --cik-map "NVDA:0001045810,AMD:0000002488,MU:0000723125,ASML:0000937966,IREN:0001878848" \
  --tickers NVDA,AMD,MU,ASML,IREN
```

Scheduled-run command (weekly; the human review step stays manual):

```sh
cd ~/workspace/atlas && python3 scripts/refresh-quarterly/edgar_refresh.py --apply >> scripts/refresh-quarterly/reports/cron.log 2>&1
```

## How it works

1. **Ticker → CIK map**: fetches `https://www.sec.gov/files/company_tickers.json`,
   cached in `.cache/` for 30 days (SEC asks for a descriptive User-Agent;
   this script sends `Atlas-data-refresh https://github.com/chronicmclan-beep/atlas`).
2. **Fetch**: `https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json` at ~4
   requests/second (under SEC's 10/s ceiling).
3. **Extract**: `us-gaap` facts, revenue tag priority
   `RevenueFromContractWithCustomerExcludingAssessedTax` → `Revenues` →
   `SalesRevenueNet`; only `form == '10-Q'` entries; the latest by period `end`
   date wins. Captures `fy`, `fp`, `filed`, and accession `accn` for provenance.
4. **Compare**: EDGAR's exact USD value vs the parsed `kpis.json` display
   string (`$10.3B` → 10.3e9). Within 3% counts as rounding noise → `unchanged`.
5. **Classify** each ticker as `updated` / `unchanged` / `needs-review`.

## Test results (2026-10-07, fixture run)

Five tickers covering the important cases, using fixtures that mirror the real
`companyfacts` schema. Expected values cross-checked against the companies'
actual earnings releases:

| Ticker | Case | Expected | Result |
|---|---|---|---|
| NVDA | fiscal 10-Q filer (FY2027 Q2) | $96.2B — matches kpis.json | `unchanged` ✓ |
| AMD | calendar 10-Q filer | kpis.json $10.3B (stale Q4'25) vs EDGAR $11.54B (Q2'26) | `updated` ✓ — catches the exact bug the owner reported |
| MU | latest 10-Q is Q3; Q4 lives in the 10-K | 10-Q ended 132 days ago | `needs-review` ✓ with "verify manually" note |
| ASML | 20-F foreign filer, no 10-Q facts | no quarterly XBRL | `needs-review` ✓ |
| IREN | uses fallback tag `Revenues` | tag priority fallback works; 10-Q 190 days old | `needs-review` ✓ (tag found, then stale-quarter rule) |

Expected values verified against earnings releases: NVDA Q2 FY2027 revenue
$96.2B (quarter ended Jul 26, 2026); AMD Q2'26 revenue $11,536M (AMD IR press
release); MU FQ4'26 revenue $54.23B (Sep 30, 2026 release).

## Known quirks / limitations

- **Q4 problem**: companies report Q4 inside the 10-K, not a 10-Q, so the
  newest 10-Q fact can lag a full quarter (e.g. MU). If the latest 10-Q ended
  more than 120 days ago the ticker is flagged `needs-review` rather than
  trusted — a human checks the 10-K/IR release.
- **Foreign filers** (ASML, ARM, NBIS — 20-F; POET has no SEC filing at all):
  no quarterly XBRL exists → always `needs-review`, manual sourcing required.
- **Tag variance**: most filers use
  `RevenueFromContractWithCustomerExcludingAssessedTax`; some use `Revenues`
  or `SalesRevenueNet`. The priority list covers the common cases; an
  unfamiliar tag surfaces as `needs-review`, never a silent skip.
- **Units**: revenue-like tags are USD; EPS facts use `USD/shares` — both are
  accepted (any unit starting with `USD`).
- **Network**: SEC rate-limits aggressively. From networks where SEC returns
  HTTP 403 (e.g. shared datacenter egress IPs), the script aborts after 5
  consecutive fetch failures with a clear diagnostic instead of producing a
  useless all-`needs-review` report. Run scheduled jobs from an unblocked
  network.
- **Amendments**: if a company amends a 10-Q, both the original and amended
  facts appear; the script takes the max `end` date, and for equal `end` dates
  the last entry in document order (amendments come later in the filing index).
  A human still reviews every `updated` row before anything is published —
  this script proposes, it never publishes.
