# Product Requests Dashboard

A request-tracking system for Sales, Ops, and Finance to submit product/feature
requests, with the Product team managing them through a live status board.

**Stack:** Next.js (App Router) + Supabase (DB, Auth, Storage, Realtime) + Resend (email) + Vercel (hosting)

## How it works

- Anyone signs up and submits a request: title, description, type (new feature /
  enhancement), urgency, and optional file/image attachments.
- **Product team reviews and approves or rejects** every request first. Rejected
  requests stop there (with an optional reason shown to the requester). Approved
  requests enter the pipeline and move **live**:
  `In Review → Discussion with Tech → In Sprint → Deployed`, with a
  `Delayed → Next Sprint` state for anything that slips.
- Product can set a **delivery estimate** ("Next 30 days", "Next 2 months", "After
  3 months") that shows on the requester's card.
- Product can privately **rate each idea** (🔥 down to 🗑️) — this is an internal-only
  reaction, never shown to the person who submitted the request.
- When a request hits **Deployed**, the original requester automatically gets an
  email.
- Every status change is logged with a timestamp, so each request has a full
  timeline.
- The **Admin Board** (`/admin`) is a separate dark "command center" view — sidebar
  navigation, live stats, and is only reachable by accounts where
  `profiles.role = 'admin'` — that's your Product team. Regular employees never see it.

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Once it's up, open **SQL Editor** → paste the entire contents of
   `supabase/schema.sql` → Run.
   This creates all tables, the auto-profile trigger, status-history logging,
   the attachments table + storage bucket, Row Level Security policies, and
   turns on Realtime.
3. Go to **Project Settings → API** and copy:
   - `Project URL` (or "API URL" under Data API) → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Secret** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — server-only)
4. Go to **Authentication → Providers** and make sure Email is enabled. Under
   **Authentication → URL Configuration**, you can turn off "Confirm email" while
   testing if you want instant signups (turn it back on for production).

> **Already had this project running before attachments/approval were added?**
> Run a two-step migration instead of the full schema file: first
> `alter type request_status add value 'rejected';` on its own, then a second
> query with the new columns, the `request_attachments` table + its policies,
> and the storage bucket + policies (see the "Storage" and "ATTACHMENTS" sections
> of `supabase/schema.sql` for the exact statements to copy).

### Make your first Product team admin

After someone signs up normally through `/signup`, promote them in the SQL editor:

```sql
update profiles set role = 'admin' where email = 'product-lead@yourcompany.com';
```

Repeat for each Product team member. There's no UI for this on purpose — it's a
one-time, deliberate action so random people can't grant themselves admin access.

---

## 2. Set up Resend (for the "Deployed" email)

1. Go to [resend.com](https://resend.com) → create an API key → that's `RESEND_API_KEY`.
2. Verify a sending domain (e.g. `yourcompany.com`) under **Domains** — this is
   required before you can send to real inboxes from your own address. Until
   it's verified, Resend only lets you send to the email you signed up with.
3. Set `RESEND_FROM_EMAIL` to an address on that domain, e.g. `requests@yourcompany.com`.

---

## 3. Run it locally

```bash
npm install
cp .env.local.example .env.local
# fill in .env.local with the values from steps 1 and 2
npm run dev
```

Visit `http://localhost:3000`, sign up, submit a request, then in another
browser (or incognito) sign up a second account and promote it to `admin` via
SQL so you can see the Admin Board approve/reject and move requests through statuses.

---

## 4. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create product-requests-dashboard --private --source=. --push
# or manually: create a repo on github.com, then
# git remote add origin <your-repo-url> && git push -u origin main
```

---

## 5. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → import your GitHub repo.
2. Add the same environment variables from `.env.local` in
   **Project Settings → Environment Variables** (all of them — including the
   service role key, it's only ever used server-side).
3. Set `NEXT_PUBLIC_APP_URL` to your real Vercel URL (e.g. `https://requests.yourcompany.com`)
   once you know it — this is just used to build the link inside the "Deployed" email.
4. Deploy. Every push to `main` redeploys automatically.

---

## Project structure

```
supabase/schema.sql        — run this once in Supabase SQL Editor (fresh installs)
src/app/login, /signup     — auth pages
src/app/requests           — requester view: submit + track "my requests" (live)
src/app/admin               — Product team's dark command-center board, admin-only
src/app/api/update-status  — server route: approve/reject, status, rating, ETA, deployed email
src/lib/supabase           — Supabase client setup (browser, server, middleware)
src/lib/types.ts           — statuses, ratings, ETA options — edit here to rename/extend
src/components             — UI pieces (cards, board, sidebar, form, badges)
public/                    — your logo (full + cropped mark) and favicon source
```

## Extending it later

- **Auto-create a GitHub Issue per request:** in `src/app/api/update-status/route.ts`,
  add a call to the GitHub REST API (`POST /repos/{owner}/{repo}/issues`) when a
  request is approved. You'll need a GitHub personal access token as another env var.
- **Slack notifications:** same pattern — add a `fetch` to a Slack incoming
  webhook URL inside the same route, next to the Resend call.
- **More statuses:** add a value to the `request_status` enum in Supabase
  (`alter type request_status add value 'your_new_status';`) and to
  `STATUS_ORDER` / `STATUS_LABELS` / `STATUS_COLORS` / `STATUS_COLORS_DARK` in `src/lib/types.ts`.
- **More rating tiers or different captions:** edit `RATING_CONFIG` and `RATING_ORDER`
  in `src/lib/types.ts` — these are original emoji reactions, not borrowed meme images,
  so feel free to make them your own.
