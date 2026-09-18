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
