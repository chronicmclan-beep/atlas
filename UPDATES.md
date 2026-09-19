# Atlas Update Log

Versioned patch notes for the Atlas dataset and site. Every data-affecting
change ships as a numbered update with a name — like game patch notes.
Format per update: **Update vN — "Name" — YYYY-MM-DD**, with Added /
Corrected / Removed / Verification sections. The full rules live in
`docs/DATA_ACCOUNTABILITY.md`.

---

## Update v9 — "Filling the Chain" — 2026-09-19

The ecosystem had two completely empty layers (materials, packaging) and
five missing names from the canonical nine-layer roster. Eleven companies
added to `companies.json` (28 → 39) and 29 supply relationships added to
`supply-edges.json` (25 → 54), all independently verified before publishing.

### Added — Companies (11)
- **Materials** (was empty): Shin-Etsu (TYO:4063, world's largest
  silicon-wafer maker), SUMCO (TYO:3436, pure-play wafer maker), Linde
  (Nasdaq:LIN, industrial gases).
- **Equipment**: Lam Research (LRCX, etch + deposition), KLA (KLAC,
  process control), Tokyo Electron (TSE:8035, coater/developers + etch).
- **Packaging** (was empty): ASE Technology (NYSE:ASX, world's largest
  OSAT), Amkor (Nasdaq:AMKR, largest US-headquartered OSAT).
- **Systems**: Vertiv (NYSE:VRT, data-center power + cooling), Eaton
  (NYSE:ETN, power management).
- **Compute**: Nebius (Nasdaq:NBIS, neocloud spun out of Yandex).

### Added — Supply edges (29)
- Materials → fabs: Shin-Etsu → Intel/TSMC; SUMCO → Intel/TSMC/Samsung;
  Linde → Samsung (Pyeongtaek, disclosed)/TSMC (Phoenix + Taiwan, reported).
- Equipment → fabs: Lam → TSMC/Samsung/Hynix/Micron/Intel; KLA →
  TSMC/Samsung; Tokyo Electron → TSMC/Intel/Samsung/Micron/Hynix.
- Packaging: ASE → AMD (reported)/Intel (disclosed); Amkor → TSMC/NVIDIA
  (disclosed).
- Systems: Vertiv → NVIDIA/Intel; Eaton → Microsoft (EnergyAware UPS pilots).
- Compute/cloud: NVIDIA → Nebius (GPUs + $700M Dec 2024 round + $2B Mar
  2026 8.3% stake); Nebius → Microsoft ($17.4B base / up to $19.4B);
  Nebius → Meta ($12B committed + up to $15B backstop).
- Omitted as below the bar: Linde → Intel Ohio (single wiki source);
  ASE/Amkor → Apple (Apple is not in the Atlas company set).

### Corrected — during verification
- Linde → Samsung geography: Taylor, TX → **Pyeongtaek, South Korea**
  (Linde's own Apr 2025 release).
- Amkor Peoria capex: ~$2B (Nov 2023) → **~$12B planned** (phase 2,
  Sep 2026).
- SUMCO → Intel citation re-dated to Intel's own 2009/2019 disclosures.
- Eaton → Microsoft trimmed to confirmed pilots; Vertiv → NVIDIA dropped
  the unverified "COOLERCHIPS" phrase.
- Nebius → Meta upgraded reported → **confirmed** (Nebius's own Mar 16,
  2026 announcement); NVIDIA → Nebius stake upgraded to confirmed.

### Also changed
- Supply-chain guided walk: new `materials` and `packaging` steps in
  supply order; equipment step now names all five tool vendors.
- `validate-data.mjs`: Data Health now counts `disclosed`-tier edges as
  sourced (previously only `reported`), since disclosed is the stronger
  tier. Supply-edges health: 49/54 (91%).

### Verification
- Three parallel researchers gathered profiles + relationships from
  primary sources (company IR, SEC 10-Ks, official press releases).
- Two independent verifiers re-checked every claim: **39/39 verifiable**
  (24 materials/equipment + 15 packaging/systems/compute), 8 confidence
  upgrades to disclosed tier, 2 corrections, 1 omission, 2 bonus edges
  found (Lam → Intel, ASE → Intel — both Intel-confirmed).
- `npm run validate` (no warnings), lint, tests (2/2), production build
  all green.

---

## Update v8 — "Ledger Reconciliation" — 2026-09-19

Two stale `financing.json` edges corrected to match facts already
verified in v5 and already present in `timeline.json` — the financing
ledger and the timeline now agree on both events.

### Corrected — Financing (2)
- AVGO → Anthropic ($35B SPV): `asOf` 2026-06-05 → **2026-06-09**;
  note "Deal closed Jun 5, 2026" → **"Deal announced Jun 9, 2026
  (first reported Jun 5)."** Jun 5 was the first Bloomberg leak; the
  official announcement was Jun 9 per Apollo's press release.
- SoftBank → OpenAI ($41B): dropped the stale "~11% stake per some
  reports — unverified" caveat → **"~11% aggregate stake confirmed by
  SoftBank's announcement (second closing Dec 26, 2025)."**

### Verification
- Independent verifier re-checked both against primary sources:
  Apollo's IR press release datelined June 9, 2026 ("AI XPV Platform...
  initial tranche of $35 billion led by Apollo, in partnership with
  Blackstone"); SoftBank Group's own announcement ("aggregate ownership
  interest in OpenAI is now approximately 11%", second closing
  Dec 26, 2025). **2/2 PASS**, no `timeline.json` mismatches.
- `npm run validate`, lint, tests, and production build all green.

---

## Update v7 — "The Missing Words" — 2026-09-19

Lexicon expansion: the glossary covered companies, products, and events
well but was missing the foundational vocabulary a reader needs for the
rest of the Atlas — the basic units of AI compute, money, and power.
Ten new entries added to `glossary-full.json` (48 → 58), all
figure-free per the file's standing rule (figures quoted in entries are
drawn from the Atlas data files, never invented).

### Added — Glossary (10)
- **GPU** (term): graphics processing unit — the chip architecture behind
  AI math; every AI accelerator in the Atlas is a GPU or a close cousin.
- **Training vs inference** (term): the two phases of AI compute — one
  giant power-hungry training run vs. per-query inference that scales
  with every user, every day.
- **Capex** (term): capital expenditure; hyperscaler capex framed as the
  Atlas's demand signal.
- **Gigawatt** (term): a billion watts — the unit the buildout is now
  measured in; why power is the industry's binding constraint.
- **Token** (term): the basic unit of LLM work (~a word fragment);
  inference demand is token demand.
- **Frontier model** (term): the most capable models at any moment; each
  generation demands an order of magnitude more training compute.
- **Data center** (term): the physical home of AI compute — who builds
  them, who fills them with chips, who pays for the electricity.
- **Advanced packaging** (term): fusing logic, memory, and interconnect
  into one package; TSMC's CoWoS as the decisive bottleneck.
- **TPU** (product): Google's Tensor Processing Unit — historically
  Google-Cloud-only, but Alphabet's Q2 2026 earnings call confirmed TPU
  systems delivered to external customer data centers for the first time.
- **Custom AI silicon (ASICs)** (product): one-customer AI chips —
  Google's TPUs, Meta's MTIA, Amazon's Trainium; the business Broadcom
  and Marvell are built on.

### Verification
- Independent verifier checked all 10 entries against primary sources
  (Google Cloud docs, Meta/AWS announcements, TSMC packaging reporting,
  Alphabet Q2 2026 earnings call): **9 PASS, 1 FAIL**.
- The FAIL was the draft TPU definition claiming TPUs were "deployed
  only inside Google Cloud" — stale as of Q2 2026, when Alphabet began
  recognizing revenue from TPU system sales delivered to customer data
  centers (CFO Anat Ashkenazi, Alphabet Q2 2026 earnings call, Jul 22,
  2026). Definition corrected before publishing; source field cites the
  earnings call.
- Style check: all 10 match the neighboring editorial voice; figure-free
  check confirmed no invented numbers.
- `npm run validate`, lint, tests, and production build all green.

---

## Update v6 — "Broadcom Reverify" — 2026-09-19

Reverification of recent Broadcom quarterly revenue, including the
fiscal/calendar alignment flagged during v2. Two independent researchers
checked five fiscal quarters against primary sources (Broadcom IR release
PDFs, SEC 8-K Exhibit 99.1 filings, FY2025 10-K); **5/5 confirmed, 0
corrections to existing figures.**

### Added — Revenue (1)
- Broadcom Q2'26 label ← fiscal Q3 FY2026 (ended Aug 2, 2026, announced
  Sep 2, 2026): **$29.591B** net revenue (semiconductor $20.839B +
  infrastructure software $8.752B = $29.591B ✓). Fills the previously
  empty slot.

### Corrected — Revenue (0 value changes, 1 flag cleared)
- The v2 `reviewFlag` ("last two calendar quarters need re-alignment")
  is **resolved as a false alarm**: fiscal Q1'26 $19.311B → label Q4'25
  and fiscal Q2'26 $22.187B → label Q1'26 were already correct under the
  documented "fiscal Qn → label Q(n−1)'yy" convention. Flag removed.
- Confirmations: fiscal Q3'25 $15.952B → Q2'25 (stored 16.0, rounding
  ✓), fiscal Q4'25 $18.015B → Q3'25 ✓, fiscal Q1'26 $19.311B → Q4'25 ✓,
  fiscal Q2'26 $22.187B → Q1'26 ✓. Segment arithmetic holds exactly for
  all five quarters. 10-K confirms the fiscal year ends on the Sunday
  closest to October 31.

### Verification
- Researcher 1 (primary sources only): Q3 FY2025–Q2 FY2026 sourced from
  IR PDFs and EDGAR 8-Ks; also corrected two announcement dates vs
  secondary coverage (Q1 FY2026 announced Mar 4, 2026, not Mar 5; Q2
  FY2026 announced Jun 3, 2026, not Jun 4).
- Researcher 2 (independent, from scratch): all five quarters
  re-sourced; per-quarter verdicts CONFIRMED ×4, SOURCED ×1 (Q3 FY2026);
  no mismatches; label mapping consistent across all five.
- `npm run validate`, lint, tests, and production build all green.

---

## Update v5 — "The Second Look" — 2026-09-18

Second independent verification pass over the remaining v2 single-pass
corrections (timeline dates, Marvell KPIs, supply-edge retiering). Two
independent verifiers checked 38 items against primary sources
(SEC filings, company releases, contemporaneous Reuters reporting):
**33 confirmed, 5 refined.** *(Count corrected 2026-09-19: 27 timeline +
9 Marvell-KPI + 2 supply-edge items = 38; "36" was a typo.)* Arm's latest quarter was already
independently verified under v4.

### Corrected — Timeline (3)
- Broadcom/Apollo/Blackstone $35B for Anthropic: Jun 5, 2026 → **Jun 9,
  2026** (Jun 5 was the first Bloomberg leak; official announcement was
  Jun 9 per Apollo's press release).
- SoftBank's $41B into OpenAI: dropped the stale "~11% stake per some
  reports — unverified" caveat — **~11% aggregate ownership is confirmed
  by SoftBank's own announcement** (second closing Dec 26, 2025).
- Stargate Abilene: date 2026-02-15 → **2026-01-01** (mid-month
  placeholder under quarter-precision displayDate "Q1 2026"); "Phase 1
  energized H1 2025" → **first two buildings live Sep 2025 (H2 2025)**,
  remaining six expected by mid-2026.
- Precision (drive-by, outside the counted refinements — the Sep 12 date
  itself was confirmed as-is): OpenAI's Sep 12, 2024 release identified as
  **o1-preview** (full o1 GA was Dec 5, 2024).

### Corrected — Supply chain (2)
- Samsung→AMD retiered **reported → disclosed**: AMD confirmed Samsung
  12-Hi HBM3E on MI350 at Advancing AI 2025 (company event, not a
  filing) — the claim itself is accurate.
- ANET→MSFT note softened: Arista's 10-K discloses the 26% revenue
  figure **anonymously** ("one end customer"); the Microsoft identity is
  BofA's analyst identification, not filing text.

### Verification
- Triple-Check Protocol: all 36 items re-checked against primary
  sources; the five refinements above are the complete correction set.
- 27 timeline items: 24 confirmed as-is (incl. Gemini/MI300X Dec 6 2023,
  o1 Sep 12 2024, $4T Jul 9 2025, US-Intel Aug 22 2025, $100B LOI Sep 22
  2025, Colossus Sep 2 2024, $6.6B Oct 2 2024, $8B Nov 22 2024, xAI $6B
  Dec 23 2024, GPT-5 Aug 7 2025, AMD-OpenAI Oct 6 2025, $122B Mar 31
  2026, TSMC $60–64B guidance Jul 16 2026, $500B MOU Aug 10 2026,
  circular scrutiny Aug 17 2026); $3.34T/$500B-MOU/Ohio-guarantee/$122B
  framings and ChatGPT-100M UBS sourcing all confirmed.
- 9 Marvell/supply items: 9/9 confirmed — Marvell FY2026 OCF $1.75B,
  GAAP net income $2.67B / $3.07 diluted EPS / $1.83B gain all match the
  8-K and 10-K; Hynix→AMD and SMCI→AMZN deletions stand (no credible
  counter-evidence); Dell→MSFT qualifier accurate; NVDA Customer A ~22%
  confirmed anonymized in the FY2026 10-K.
- `npm run validate`, lint, tests, and production build all green.

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
Basudev's amendments. *(2026-09-19: one of the 56 — the Arm 350B+ chips
figure — was withdrawn as an unconfirmed auditor overcall; the working
total is 55. The data was never changed for that item.)* First update applied under the Data Accountability
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
