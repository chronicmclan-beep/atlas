#!/usr/bin/env python3
"""
EDGAR quarterly refresh — report-only by default.

Pulls the latest QUARTERLY revenue (plus net income and diluted EPS where
present) for every ticker in Atlas's kpis.json directly from SEC EDGAR's
XBRL companyfacts API — the primary source, machine-readable, no human
transcription — and compares each against the "Latest quarter" figure
currently in kpis.json.

Default mode NEVER edits data files. It produces two artifacts:
  reports/refresh-report-YYYYMMDD.json  (machine-readable)
  reports/refresh-report-YYYYMMDD.md    (human-readable old -> new table)

  --apply   additionally writes reports/staging-quarterly-YYYYMMDD.json
            with proposed kpis.json patches for human review. The data
            files themselves are never touched by this script.

  --tickers NVDA,AMD   limit the run to specific tickers
  --facts-dir DIR      read companyfacts JSON from local files instead of
                       HTTP (used for offline testing with fixtures)

Every ticker ends in one of three states:
  updated      EDGAR's latest 10-Q quarter differs from kpis.json
  unchanged    values agree (within rounding tolerance)
  needs-review no CIK (e.g. POET), no usable tags, HTTP error, or the
               latest 10-Q is suspiciously old (Q4 may live in the 10-K)

Rate limiting: ~4 requests/second, under SEC's 10/s ceiling, with a
descriptive User-Agent as SEC requires.

Stdlib only. Python 3.8+.
"""

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
CACHE_DIR = HERE / ".cache"
CACHE_PATH = CACHE_DIR / "company_tickers.json"
CACHE_MAX_AGE_DAYS = 30
REPORTS_DIR = HERE / "reports"

SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
SEC_FACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
USER_AGENT = "Atlas-data-refresh https://github.com/chronicmclan-beep/atlas"

RATE_DELAY = 0.25  # seconds between requests -> ~4/s, under SEC's 10/s limit
UNCHANGED_TOLERANCE = 0.03  # 3% relative difference counts as rounding noise
STALE_Q_DAYS = 120  # latest 10-Q older than this -> needs-review (Q4 may be in 10-K)

# Revenue tag priority: most filers use the first; fall back down the list.
REVENUE_TAGS = [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues",
    "SalesRevenueNet",
]
NI_TAG = "NetIncomeLoss"
EPS_TAG = "EarningsPerShareDiluted"


# --------------------------------------------------------------------------
# HTTP + caching
# --------------------------------------------------------------------------

def fetch_json(url, timeout=30):
    """GET a JSON URL. Returns (data, None) or (None, error_string)."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT,
                                               "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8")), None
    except urllib.error.HTTPError as e:
        return None, f"HTTP {e.code}"
    except urllib.error.URLError as e:
        return None, f"URL error: {e.reason}"
    except (json.JSONDecodeError, TimeoutError) as e:
        return None, f"parse/timeout error: {e}"
    except Exception as e:  # never let one ticker kill the run
        return None, f"unexpected error: {type(e).__name__}: {e}"


def load_ticker_map():
    """Ticker -> zero-padded 10-digit CIK, cached locally for 30 days."""
    if CACHE_PATH.exists():
        age_days = (time.time() - CACHE_PATH.stat().st_mtime) / 86400
        if age_days < CACHE_MAX_AGE_DAYS:
            try:
                raw = json.loads(CACHE_PATH.read_text())
                return {v["ticker"]: f"{v['cik_str']:010d}" for v in raw.values()}, "cache"
            except (json.JSONDecodeError, KeyError):
                pass  # fall through to refetch
    data, err = fetch_json(SEC_TICKERS_URL)
    if data is None:
        # Stale cache is better than nothing.
        if CACHE_PATH.exists():
            try:
                raw = json.loads(CACHE_PATH.read_text())
                return {v["ticker"]: f"{v['cik_str']:010d}" for v in raw.values()}, "stale-cache"
            except (json.JSONDecodeError, KeyError):
                pass
        return {}, f"fetch-failed: {err}"
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(data))
    return {v["ticker"]: f"{v['cik_str']:010d}" for v in raw_values(data)}, "fresh"


def raw_values(data):
    return data.values() if isinstance(data, dict) else data


# --------------------------------------------------------------------------
# XBRL extraction
# --------------------------------------------------------------------------

def latest_quarterly_entry(facts, tags):
    """Return the latest 10-Q entry across the tag priority list.

    Returns (tag_used, entry) or (None, None). Entry carries val (USD),
    end, fy, fp, filed, accn, form.
    """
    us_gaap = (facts.get("facts") or {}).get("us-gaap") or {}
    for tag in tags:
        node = us_gaap.get(tag)
        if not node:
            continue
        units = node.get("units") or {}
        # Revenue-like tags are USD; EPS is USD/shares — take USD-family units.
        candidates = []
        for unit, entries in units.items():
            if not unit.startswith("USD"):
                continue
            for e in entries:
                if e.get("form") == "10-Q" and e.get("end") and e.get("val") is not None:
                    candidates.append(e)
        if not candidates:
            continue
        # Latest quarter = max period end date.
        best = max(candidates, key=lambda e: e["end"])
        return tag, {
            "val": best["val"],
            "end": best["end"],
            "fy": best.get("fy"),
            "fp": best.get("fp"),
            "filed": best.get("filed"),
            "accn": best.get("accn"),
            "form": best.get("form"),
        }
    return None, None


def usd_display(val):
    """1.15e10 -> '$11.54B'."""
    a = abs(val)
    if a >= 1e9:
        return f"${val / 1e9:,.2f}B"
    if a >= 1e6:
        return f"${val / 1e6:,.1f}M"
    if a >= 1e3:
        return f"${val / 1e3:,.0f}K"
    return f"${val:,.0f}"


def parse_display_value(s):
    """'$10.3B' / '$11,536' / '~$6.7B' / '$2.65' -> USD float. None if unparseable."""
    if s is None:
        return None
    t = str(s).strip().replace("~", "").replace("$", "").replace(",", "")
    m = re.fullmatch(r"(-?[\d.]+)\s*([BMK])?", t, re.IGNORECASE)
    if not m:
        return None
    num = float(m.group(1))
    mult = {"B": 1e9, "M": 1e6, "K": 1e3, None: 1}[m.group(2).upper() if m.group(2) else None]
    return num * mult


def quarter_age_days(end_iso):
    try:
        end = datetime.strptime(end_iso, "%Y-%m-%d").date()
        return (date.today() - end).days
    except (ValueError, TypeError):
        return None


# --------------------------------------------------------------------------
# kpis.json reading
# --------------------------------------------------------------------------

def load_kpis_records(repo_root):
    path = repo_root / "src" / "data" / "kpis.json"
    records = json.loads(path.read_text())
    out = {}
    for rec in records:
        metrics = rec.get("metrics") or []
        lq = next((m for m in metrics if m.get("label") == "Latest quarter"), None)
        out[rec["ticker"]] = {
            "value": (lq or {}).get("value"),
            "sub": (lq or {}).get("sub"),
            "tier": (lq or {}).get("tier"),
        }
    return out


# --------------------------------------------------------------------------
# Per-ticker processing
# --------------------------------------------------------------------------

def process_ticker(ticker, cik, current, facts_dir=None):
    """Returns a result dict with status updated|unchanged|needs-review."""
    result = {"ticker": ticker, "cik": cik, "current": current,
              "status": "needs-review", "note": ""}
    if not cik:
        result["note"] = "No SEC CIK for this ticker (e.g. OTC listing) — manual sourcing required."
        return result

    facts = None
    if facts_dir:
        p = Path(facts_dir) / f"CIK{cik}.json"
        if p.exists():
            try:
                facts = json.loads(p.read_text())
            except json.JSONDecodeError as e:
                result["note"] = f"Fixture parse error: {e}"
                return result
        else:
            result["note"] = f"No fixture file {p.name} — manual sourcing required."
            return result
    else:
        facts, err = fetch_json(SEC_FACTS_URL.format(cik=cik))
        if facts is None:
            result["note"] = f"EDGAR fetch failed ({err}) — retry next run."
            return result
        time.sleep(RATE_DELAY)

    tag, rev = latest_quarterly_entry(facts, REVENUE_TAGS)
    if rev is None:
        result["note"] = ("No 10-Q quarterly revenue under tags "
                          + "/".join(REVENUE_TAGS)
                          + " — foreign filer (20-F/40-F) or non-standard tagging; manual sourcing required.")
        return result

    result["edgar"] = {
        "tag": tag,
        "value_usd": rev["val"],
        "value_display": usd_display(rev["val"]),
        "quarter": f"FY{rev['fy']} {rev['fp']}" if rev.get("fy") else rev.get("fp"),
        "end": rev["end"],
        "filed": rev["filed"],
        "accn": rev["accn"],
        "form": rev["form"],
    }
    # Bonus context: quarterly net income + diluted EPS where tagged.
    _, ni = latest_quarterly_entry(facts, [NI_TAG])
    _, eps = latest_quarterly_entry(facts, [EPS_TAG])
    if ni:
        result["edgar"]["net_income_usd"] = ni["val"]
        result["edgar"]["net_income_display"] = usd_display(ni["val"])
    if eps:
        result["edgar"]["eps_diluted"] = eps["val"]

    age = quarter_age_days(rev["end"])
    if age is not None and age > STALE_Q_DAYS:
        result["status"] = "needs-review"
        result["note"] = (f"Latest 10-Q ended {rev['end']} ({age} days ago). "
                          "A newer quarter (e.g. Q4 in the 10-K) may exist — verify manually.")
        return result

    cur_val = parse_display_value(current.get("value"))
    if cur_val is None:
        result["status"] = "updated"
        result["note"] = "No parseable current value in kpis.json — EDGAR value is the candidate."
        return result

    rel = abs(rev["val"] - cur_val) / max(abs(cur_val), 1)
    if rel <= UNCHANGED_TOLERANCE:
        result["status"] = "unchanged"
        result["note"] = f"Within {UNCHANGED_TOLERANCE:.0%} of kpis.json (rounding noise)."
    else:
        result["status"] = "updated"
        result["note"] = (f"kpis.json shows {current.get('value')} ({current.get('sub')}); "
                          f"EDGAR 10-Q shows {usd_display(rev['val'])} for {result['edgar']['quarter']}.")
    return result


# --------------------------------------------------------------------------
# Reports
# --------------------------------------------------------------------------

def write_reports(results, run_date):
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    json_path = REPORTS_DIR / f"refresh-report-{run_date}.json"
    md_path = REPORTS_DIR / f"refresh-report-{run_date}.md"

    summary = {"run_date": run_date, "results": results}
    json_path.write_text(json.dumps(summary, indent=2))

    counts = {}
    for r in results:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    lines = [
        f"# EDGAR quarterly refresh — {run_date}",
        "",
        f"Tickers checked: {len(results)} · "
        + " · ".join(f"{k}: {counts.get(k, 0)}" for k in ("updated", "unchanged", "needs-review")),
        "",
        "Source: SEC EDGAR XBRL companyfacts (primary source). "
        "Figures below are report-only — nothing was written to the data files.",
        "",
        "| Ticker | Status | kpis.json now | EDGAR latest 10-Q | Quarter (filed) | Accession | Note |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in results:
        e = r.get("edgar") or {}
        cur = r.get("current") or {}
        new = e.get("value_display", "—") if e else "—"
        q = (e.get("quarter", "—") + f" (filed {e['filed']})") if e.get("filed") else (e.get("quarter", "—") if e else "—")
        lines.append(
            f"| {r['ticker']} | {r['status']} | {cur.get('value') or '—'} "
            f"| {new} | {q} | {e.get('accn', '—')} | {r.get('note', '')} |"
        )
    md_path.write_text("\n".join(lines) + "\n")
    return json_path, md_path


def write_staging(results, run_date):
    """Proposed kpis.json patches for human review. Never applied automatically."""
    patches = {}
    for r in results:
        if r["status"] != "updated" or not r.get("edgar"):
            continue
        e = r["edgar"]
        patches[r["ticker"]] = {
            "Latest quarter": {
                "value": e["value_display"],
                "sub": f"{e['quarter']}; filed {e['filed']}",
                "tier": "reported",
                "source": f"SEC EDGAR XBRL companyfacts ({e['tag']})",
                "asOf": f"quarter ended {e['end']} · 10-Q filed {e['filed']}",
                "accn": e["accn"],
            }
        }
    path = REPORTS_DIR / f"staging-quarterly-{run_date}.json"
    path.write_text(json.dumps({"run_date": run_date, "patches": patches}, indent=2))
    return path, len(patches)


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main(argv=None):
    ap = argparse.ArgumentParser(description="EDGAR quarterly refresh (report-only by default).")
    ap.add_argument("--tickers", help="Comma-separated tickers to check (default: all in kpis.json).")
    ap.add_argument("--facts-dir", help="Read companyfacts JSON from DIR instead of HTTP (testing).")
    ap.add_argument("--cik-map", help="Comma-separated TICKER:CIK overrides (e.g. NVDA:0001045810), "
                                      "used when the SEC ticker map is unavailable, e.g. with --facts-dir.")
    ap.add_argument("--apply", action="store_true",
                    help="Also write a staging file with proposed patches (data files untouched).")
    ap.add_argument("--max-failures", type=int, default=5,
                    help="Abort after this many consecutive fetch failures (default 5). "
                         "A blocked network (e.g. SEC 403 on a shared egress IP) fails fast "
                         "instead of producing 63 useless needs-review rows.")
    args = ap.parse_args(argv)

    repo_root = HERE.parent.parent
    current = load_kpis_records(repo_root)
    tickers = ([t.strip().upper() for t in args.tickers.split(",")] if args.tickers
               else sorted(current.keys()))
    tickers = [t for t in tickers if t in current]
    if not tickers:
        print("No matching tickers in kpis.json.", file=sys.stderr)
        return 2

    ticker_map, map_note = ({}, "fixture-mode") if args.facts_dir else load_ticker_map()
    if args.cik_map:
        for pair in args.cik_map.split(","):
            t, c = pair.split(":")
            ticker_map[t.strip().upper()] = c.strip().zfill(10)
    if not args.facts_dir and map_note.startswith("fetch-failed"):
        print(f"Could not load SEC ticker map and no cache: {map_note}", file=sys.stderr)
        return 2
    if map_note != "fixture-mode":
        print(f"Ticker map: {map_note} ({len(ticker_map)} entries).", file=sys.stderr)

    results = []
    consec_failures = 0
    for i, t in enumerate(tickers):
        cik = ticker_map.get(t)
        r = process_ticker(t, cik, current[t], facts_dir=args.facts_dir)
        results.append(r)
        print(f"[{i+1}/{len(tickers)}] {t}: {r['status']}", file=sys.stderr)
        if r["status"] == "needs-review" and "fetch failed" in r.get("note", ""):
            consec_failures += 1
            if consec_failures >= args.max_failures and not args.facts_dir:
                print(f"Aborting: {consec_failures} consecutive EDGAR fetch failures. "
                      f"The network path to data.sec.gov appears blocked (SEC returned "
                      f"{r['note']}). Run from an unblocked network.", file=sys.stderr)
                break
        else:
            consec_failures = 0

    run_date = date.today().strftime("%Y%m%d")
    jp, mp = write_reports(results, run_date)
    print(f"Report JSON: {jp}")
    print(f"Report MD:   {mp}")
    if args.apply:
        sp, n = write_staging(results, run_date)
        print(f"Staging file ({n} proposed patches, NOT applied): {sp}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
