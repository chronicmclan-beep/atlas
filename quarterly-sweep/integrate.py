#!/usr/bin/env python3
"""Quarterly freshness sweep integration — applies verified IR data to kpis.json + revenue.json.
Run only after all quarterly-sweep/*.json research files are present."""
import json, copy, sys

ATLAS = '/home/hatch/workspace/atlas'
SWEEP = ATLAS + '/quarterly-sweep'

kpis = json.load(open(ATLAS + '/src/data/kpis.json'))
rev = json.load(open(ATLAS + '/src/data/revenue.json'))

# (ticker): (new_value, new_sub) for the "Latest quarter" metric
LQ = {
    'AMD':   ('$11.54B', "Q2'26; +50% YoY"),
    'INTC':  ('$16.13B', "Q2'26; +25% YoY"),
    'AVGO':  ('$29.59B', "Q3 FY2026; +86% YoY"),
    'MRVL':  ('$2.74B',  "Q2 FY2027; +37% YoY"),
    'AMZN':  ('$200.6B', "Q2 2026; +20% YoY"),
    'GOOGL': ('$119.8B', "Q2 2026; +24% YoY"),
    'Meta':  ('$60.8B',  "Q2 2026; +28% YoY"),
    'Oracle':('$19.35B', "Q1 FY2027; +30% YoY"),
    'CRWV':  ('$2.58B',  "Q2 2026; +112% YoY"),
    # precision / company-reported-YoY tweaks (quarter unchanged)
    'ASML':  ('$10.8B', "Q2 2026 (ended Jun 30, 2026); +21% YoY \u00b7 \u20ac9.33B net sales (Jul 15, 2026 earnings release)"),
    'AMAT':  ('$9.1B',  "Q3 FY2026 (ended Jul 26, 2026); +25% YoY"),
    'CRM':   ('$11.3B', "Q2 FY2027; +11% YoY (Q2 FY2027 10-Q)"),
    'SNOW':  ('$1.55B', "Q2 FY2027; +35% YoY (Q2 FY2027 10-Q)"),
    'TEAM':  ('$1.8B',  "Q4 FY2026; +28% YoY (Atlassian Q4/FY2026 earnings release, Aug 6 2026)"),
    'TWLO':  ('$1.5B',  "Q2 2026; +22% YoY (10-Q)"),
    'CRWD':  ('$1.5B',  "Q2 FY2027; +26% YoY (10-Q)"),
    'PANW':  ('$3.4B',  "Q4 FY2026; +34% YoY"),
    'ZS':    ('$898M',  "Q4 FY2026; +25% YoY"),
    'FTNT':  ('$2.05B', "Q2 2026; +26% YoY (10-Q)"),
    'PLTR':  ('$1.9B',  "Q2 2026; +93% YoY (Q2 2026 10-Q)"),
    'GLXY':  ('$8.7B',  "Q2 2026; \u22123.8% YoY (computed from 8-K quarterly supplement)"),
    'DDOG':  ('$1.1B',  "Q2 2026; +36% YoY (Q2 2026 10-Q)"),
    'APP':   ('$1.9B',  "Q2 2026; +53% YoY (Q2 2026 10-Q)"),
    'MDB':   ('$771.8M',"Q2 FY2027; +30% YoY (Q2 FY2027 10-Q)"),
    'NET':   ('$696.1M',"Q2 2026; +36% YoY (10-Q)"),
    'S':     ('$292.0M',"Q2 FY2027; +21% YoY (10-Q)"),
    'OKTA':  ('$805.0M',"Q2 FY2027; +11% YoY (10-Q)"),
    'GEV':   ('$11.1B', "Q2 2026; +22% YoY"),
}

# record-level provenance for the 9 quarter-changed records: (asOf_suffix, source_suffix)
PROV = {
    'AMD':   ("LQ Q2'26 (rel. Aug 4 2026)", "AMD Q2 2026 earnings release (Aug 4 2026)"),
    'INTC':  ("LQ Q2'26 (rel. Jul 23 2026)", "Intel Q2 2026 earnings release (8-K EX-99.1, Jul 23 2026)"),
    'AVGO':  ("LQ Q3 FY2026 (rel. Sep 2 2026)", "Broadcom Q3 FY2026 earnings release (8-K EX-99.1, Sep 2 2026)"),
    'MRVL':  ("LQ Q2 FY2027 (rel. Aug 27 2026)", "Marvell Q2 FY2027 earnings release (Aug 27 2026)"),
    'AMZN':  ("LQ Q2 2026 (rel. Jul 30 2026)", "Amazon Q2 2026 earnings release (Jul 30 2026)"),
    'GOOGL': ("LQ Q2 2026 (rel. Jul 22 2026)", "Alphabet Q2 2026 earnings release (Jul 22 2026)"),
    'Meta':  ("LQ Q2 2026 (rel. Jul 29 2026)", "Meta Q2 2026 earnings release (Jul 29 2026)"),
    'Oracle':("LQ Q1 FY2027 (rel. Sep 10 2026)", "Oracle Q1 FY2027 earnings release (Sep 10 2026)"),
    'CRWV':  ("LQ Q2 2026 (rel. Aug 11 2026)", "CoreWeave Q2 2026 earnings release (Aug 11 2026)"),
}

changed_lq = []
for r in kpis:
    t = r['ticker']
    if t in LQ:
        m = next(x for x in r['metrics'] if x['label'] == 'Latest quarter')
        old = (m['value'], m['sub'])
        new = LQ[t]
        if old != new:
            changed_lq.append((t, old[0], old[1], new[0], new[1]))
        m['value'], m['sub'] = new
        if t in PROV:
            r['asOf'] = r.get('asOf', '') + ' \u00b7 ' + PROV[t][0]
            r['source'] = r.get('source', '') + '; ' + PROV[t][1]

print(f'Latest-quarter metrics updated: {len(changed_lq)} changed')
for t, ov, os, nv, ns in changed_lq:
    print(f'  {t}: {ov} [{os}] -> {nv} [{ns}]')

# ---- revenue.json: rebuild series from sr1/sr2, extend quarters to Q3'26 ----
sr1 = json.load(open(SWEEP + '/sr1-series.json'))['series']
sr2 = json.load(open(SWEEP + '/sr2-series.json'))['series']
all_series = {**sr1, **sr2}

if "Q3'26" not in rev['quarters']:
    rev['quarters'].append("Q3'26")

# Oracle Q1 FY2027 (ended Aug 31 2026) = calendar Q3'26, verified $19.345B
Q3_26 = {'Oracle': 19.345}

for s in rev['series']:
    t = s['ticker']
    if t in all_series:
        vals = list(all_series[t]['values'])
        assert len(vals) == 18, f'{t}: expected 18 values, got {len(vals)}'
        vals.append(Q3_26.get(t))  # None if no verified Q3'26
        s['revenue'] = vals
        s['tier'] = 'reported'
        print(f'  series rebuilt: {t} ({len(vals)} pts, Q3\'26={Q3_26.get(t)})')
    else:
        # extend with null for tickers without rebuilt data
        if len(s['revenue']) == 18:
            s['revenue'].append(None)

# update the note to document the Q3'26 extension
rev['note'] += (" Q3'26 added 2026-10-07: only Oracle has a verified Q3'26 quarter"
                " (Q1 FY2027, ended Aug 31 2026, $19.345B); all other series are null there."
                " Series rebuilt 2026-10-07 from SEC EDGAR XBRL (10-Q/10-K) and IR releases;"
                " fiscal-Q4/calendar-Q4 points derived as annual minus three quarters, tied to reported annuals.")

json.dump(kpis, open(ATLAS + '/src/data/kpis.json', 'w'), indent=1, ensure_ascii=False)
open(ATLAS + '/src/data/kpis.json', 'a').write('\n')
json.dump(rev, open(ATLAS + '/src/data/revenue.json', 'w'), indent=1, ensure_ascii=False)
open(ATLAS + '/src/data/revenue.json', 'a').write('\n')
print('WROTE kpis.json and revenue.json')
