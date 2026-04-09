# Decom impact on CNS pins

Next.js app (Vercel-ready) for Network Engineering: compare **CNS pins** and **NRB tickets** before versus after **mmWave shutdown** dates, keyed by **Fuze site ID**. Includes a **simulated email** preview (no mail is sent).

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a normal browser (not a raw HTML preview). You should see Inter/sans-serif typography, purple primary accents, and a two-column shell—not default blue underlined links or Times New Roman.

### Styles look unstyled?

- Run from the project root after `npm install`, then `npm run dev` or `npm run build && npm start`.
- In DevTools → **Network**, confirm `/_next/static/css/*.css` returns **200** (not blocked by a proxy or corporate filter).
- If you host behind **IIS** or a reverse proxy, ensure requests to `/_next/static/*` are forwarded to the Node/Next server.
- After changing Tailwind or PostCSS, delete the `.next` folder and run `npm run dev` again.

## Workbooks

The parser scans **every worksheet** and the **first 40 rows** of each to find a **header row** that includes a Fuze / site ID column and a shutdown (or event) date column. Title rows or notes above the table are OK.

If analysis still returns *No valid decom rows*, the red error panel lists **parser hints** (detected column names from row 1, etc.). Check that dates are real dates or text in a common format (`yyyy-MM-dd`, `MM/dd/yyyy`, etc.).

### Decom / shutdowns

Required columns (header names are matched flexibly):

- **Fuze site ID** — e.g. `Fuze Site ID`, `FUZE_SITE_ID`, `FuzeSiteId`
- **Shutdown date** — e.g. `Shutdown Date`, `Date of mmWave Shutdown`, `Decom Date`

Optional:

- **NA engineer email / name** — used to group simulated emails

If the same Fuze ID appears more than once, the **latest** shutdown date is kept and a warning is shown.

### CNS / NRB

Required:

- **Fuze site ID** (same semantics as decom file)
- **Event date** — e.g. `Pin Date`, `Event Date`, `Created Date`, `Ticket Date`

Optional:

- **Type** — if the value contains `NRB` it counts as NRB; if it contains `CNS` as CNS; otherwise defaults to **CNS**
- **ID** — e.g. `Pin ID`, `Ticket ID` (shown in the pin drill-down)

Rows whose Fuze ID is not present in the decom file are counted in **CNS rows (no shutdown match)**.

## Analysis rules

- **Pre window:** calendar days from `shutdownDate - preDays` through the day **before** shutdown (in the selected IANA timezone, default `America/New_York`).
- **Post window:** from **shutdown day** through `min(shutdownDate + postDays, “today” in that timezone)` so incomplete future periods do not skew results.
- **Flagging (default)** uses **total** count = CNS + NRB in each window:
  - If **pre total is positive:** flag when `post ≥ minPostWhenPrePositive` **and** `post/pre ≥ minRatioWhenPrePositive`.
  - If **pre total is zero:** flag when `post ≥ minPostWhenPreZero` (no ratio).

## API

- `POST /api/decom/analyze` — `multipart/form-data` with `decomFile`, `cnsFile`, and optional numeric/string fields: `preDays`, `postDays`, `minPostWhenPrePositive`, `minRatioWhenPrePositive`, `minPostWhenPreZero`, `timeZone`.
- `POST /api/decom/simulate-email` — JSON `{ "sites": [ ...SiteAnalysisRow ] }` (typically flagged rows from the last analysis). Returns `{ "emails": [ { to, subject, textBody, htmlBody } ] }`.

## Vercel / limits

- Hobby tier request bodies are roughly **4.5 MB**; very large Excel extracts may need **Pro**, client-side parsing, or smaller extracts.
- `vercel.json` sets **60s** max duration for the analyze route.

## Future (v2)

- Real delivery via **Resend** (or corporate SMTP) using the same email bodies.
- Optional persistence / scheduled runs.

## Branding

Verizon logo and theme align with internal Network Engineering tooling patterns.
