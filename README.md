# My Budget

Personal budgeting web app for a single user. React (Vite) frontend + Supabase (Postgres + email/password auth). Manual entry only — no bank linking.

## Setup

1. Create a [Supabase](https://supabase.com) project.
2. In the SQL Editor, run these migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_category_entries.sql`
   - `supabase/migrations/003_entry_date.sql`
3. Create your user under **Authentication → Users** (email/password). Sign-up is not exposed in the app.
4. Copy env vars:

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from **Project Settings → API**.

5. Install and run:

```bash
npm install
npm run dev
```

## Deploy on Vercel

1. Push this repo and import it in Vercel.
2. Set the same `VITE_SUPABASE_*` environment variables in the Vercel project.
3. Build command: `npm run build` · Output: `dist` (Vite defaults).
4. `vercel.json` rewrites all routes to `index.html` for the SPA.

In Supabase **Authentication → URL Configuration**, add your Vercel URL to Site URL / Redirect URLs if needed.

## Features

- Sections: Income, Fixed Costs, Variable Costs, Investments, Savings
- Per-category cost breakdown: expand a category to add multiple payments; Spent is the sum, Remaining = Budgeted − Spent
- Summary: Total Budgeted, Total Spent, Leftover (Net Income − Total Spent)
- Month navigation with copy-forward of categories/budgeted amounts on **+ New Month**
