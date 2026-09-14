# Maintaining the Atlas — a plain-language guide

This is written for a non-technical owner. The golden rule: **the app only reads
from the data files in `src/data/`.** You change what the site shows by editing
those files — never the code. And every safety net below exists so a bad edit
can't quietly break the live site.

You can always just ask Claude to do any of this ("add a company…", "save a
version", "roll it back"). The exact steps are here too, for reference.

---

## How to add a company (safely)

1. Open `src/data/companies.json`.
2. Copy an existing entry and change the values. Required fields:
   - `ticker` — a short unique code (e.g. `"NVDA"`). This is the id other files use.
   - `name` — the display name (e.g. `"NVIDIA"`).
   - `layer` — which layer it belongs to. Must be one of:
     `materials, equipment, chip-design, foundry, memory, packaging, systems, compute, labs`.
   - `color` — a hex color like `"#76B900"`.
   - Optional: `secondaryLayer`, `role`, `aliases`, `logo`.
3. To show it on a **Layer map** card, add its name to that layer's `companies`
   list in `src/data/layers.json`.
4. To use it elsewhere, reference its **ticker** in the relevant file (kpis,
   revenue, supply-edges, financing, or timeline).
5. Check it: run `npm run validate` (or ask Claude). Fix anything it flags.
6. Preview it: `npm run dev`, then open the local address it prints.
7. Save a version (below).

## How to add a data point (safely)

Same idea — edit the matching file, then validate. Examples:
- **Timeline event** → add an entry to `src/data/timeline.json` with `date`,
  `title`, `category` (a valid category id), `tier` (`"major"` or `"minor"`),
  `era` (a year like `"2025"`), a `description`, `source`, and a `companies`
  list of **existing tickers**.
- **Financing flow** → add an entry to `src/data/financing.json` with `from` and
  `to` (existing tickers), `type`, `amount`, `realized` (true/false), `tier`.
- **Supply relationship** → add to `src/data/supply-edges.json` with `from`,
  `to`, `type`, `tier`.

Always run `npm run validate` afterward — it catches typos like a misspelled
ticker before they reach the site.

---

## How to save a version

A "version" is a labeled snapshot you can return to. Save one after any change
you're happy with.

- **Easiest:** tell Claude *"save a version — <what changed>"*.
- **By hand** (in a terminal in the project folder):
  ```
  git add -A
  git commit -m "short description of what changed"
  git push
  ```
That records the snapshot locally and backs it up to your private GitHub repo.

## How to roll back (undo a change)

Nothing is ever lost — every saved version is kept.

- **Easiest:** tell Claude *"roll back to the last good version"* (or name it).
- **Undo the most recent saved change** (keeps history clean):
  ```
  git revert HEAD
  git push
  ```
  This creates a new snapshot that undoes the last one.
- **Throw away un-saved edits to one file** and restore it to the last version:
  ```
  git checkout -- path/to/file.json
  ```

If you're ever unsure, don't guess — ask Claude and describe what you want undone.

---

## How to read a failed check

**1. A local check failed (you or Claude ran a build/validate).**
The message names the file and the problem in plain words, for example:

> ✗ Data check FAILED — 1 problem found:
> • src/data/timeline.json — event "ChatGPT launches" references unknown company "OpenAl" (not in companies.json).

Open that file, fix that exact thing (here: the misspelled `OpenAl` → `OpenAI`),
and run the check again.

**2. A check failed on GitHub (a red ✗).**
- Go to your repo on github.com → the **Actions** tab.
- Click the run with the red ✗, then click the job called **checks**.
- The failed step is highlighted — **Validate data files**, **Smoke tests**, or
  **Production build** — with the same plain message. Fix the file it points to,
  save a version, and the check re-runs automatically.

A green ✓ means data validation, the smoke tests, and the production build all
passed — the change is safe.

---

## When we launch (future)

Once the site is public with real users, add an **error-monitoring / feedback
service** (e.g. Sentry). See the note at the end of the build plan — it reports
real errors visitors hit, with enough detail to fix them, which the checks above
can't do because they only run before launch, not while people use the site.
