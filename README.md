# Watchlist App

Personal equity watchlist with thesis grading. Deploy on Vercel, drive from anywhere — Claude skill, mobile browser, desktop browser.

## What you get

- **`/login`** — token gate
- **`/dashboard`** — sortable performance table, excess-return chart, drill-down per stock with thesis & catalysts, add/edit/remove buttons
- **`/api/list`** — fetch watchlist with live prices and grades (auth required)
- **`/api/add`**, **`/api/remove`**, **`/api/update`** — write endpoints (auth required)
- **`/api/prices`** — ad-hoc price lookup utility

## Architecture

- Next.js 14 App Router (TypeScript)
- Supabase (Postgres) for storage — table `watchlist_entries`, one row per entry
- Yahoo Finance for prices (no API key needed, server-side fetch)
- Single shared bearer token for all access (you, the skill, anyone you share the URL+token with)

## Deploy

### 1. Push to GitHub

```bash
cd watchlist-app
git init
git add .
git commit -m "Initial watchlist app"
git remote add origin git@github.com:<you>/watchlist.git
git push -u origin main
```

### 2. Connect Vercel to the repo

- Go to https://vercel.com/new
- Import the repo
- Don't deploy yet — set up env vars first

### 3. Provision Supabase

- Create a project at https://supabase.com (or reuse an existing one)
- Open the SQL editor and run [`scripts/schema.sql`](scripts/schema.sql) — creates the `watchlist_entries` table with constraints and the `updated_at` trigger
- From Project Settings → API, grab `Project URL` and the `service_role` key (NOT the anon key — service role bypasses RLS and is server-side only)

### 4. Generate and set the watchlist token

Generate a random token:
```bash
openssl rand -base64 32
```

In Vercel → Settings → Environment Variables → add (all three, applied to Production, Preview, Development):
- `WATCHLIST_TOKEN` = the generated string
- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` = the service-role key (keep secret — bypasses RLS)

### 5. Deploy

Click Deploy. Once live, visit your URL (e.g. `watchlist-yourname.vercel.app`), enter the token, you're in.

### 6. Configure the Claude skill

Open the `stock-watchlist` skill's `references/config.md` and set:
- `API_BASE_URL` = your Vercel URL
- `WATCHLIST_TOKEN` = same token

## Local development

```bash
cp .env.example .env.local
# fill in SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY, set WATCHLIST_TOKEN
npm install
npm run dev
```

## Endpoints

### `GET /api/list`
Returns the full watchlist with live prices, returns, excess-vs-benchmark, and grade for each entry.

```bash
curl "https://yourapp.vercel.app/api/list?token=$TOKEN"
```

### `POST /api/add`
Add a new entry. Validates targets (bear < base < bull), required fields, etc.

```bash
curl -X POST "https://yourapp.vercel.app/api/add" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "NVDA",
    "exchange": "NASDAQ",
    "currency": "USD",
    "analysis_date": "2026-05-07",
    "anchor_price": 145.00,
    "bull_target": 200.00,
    "base_target": 165.00,
    "bear_target": 100.00,
    "thesis_oneliner": "...",
    "catalysts": ["Q1 earnings"],
    "tags": ["ai", "semis"]
  }'
```

### `POST /api/remove`
```bash
curl -X POST "https://yourapp.vercel.app/api/remove" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ticker": "NVDA", "exchange": "NASDAQ"}'
```

### `POST /api/update`
```bash
curl -X POST "https://yourapp.vercel.app/api/update" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "NVDA",
    "exchange": "NASDAQ",
    "patch": { "base_target": 175.00 }
  }'
```

## Grading

Stocks are auto-graded against price targets:
- **BULL_HIT** — current ≥ bull target
- **WIN** — current ≥ base target (but below bull)
- **NEUTRAL** — current between bear and base
- **MISS** — current < bear target
- **UNGRADED** — price fetch failed

Excess return is stock return minus benchmark return (^GSPC by default), both anchored to the analysis date.

## Notes

- All prices fetched live from Yahoo Finance on every `/api/list` call. No caching. If you have many entries this is fine — Vercel functions are fast.
- Anchor date matching: closest trading day on or before the analysis date.
- Currency-aware display (USD, GBP, GBp pence, EUR, AUD).
- Tickers and exchange codes are uppercased on insert/update to enforce case-insensitive uniqueness.

## Regression check

After deploying, smoke-test the full add → list → update → remove cycle:

```bash
BASE_URL=https://idea-watchlist.vercel.app TOKEN=your-token ./scripts/test-api.sh
```
