# MAGI · Budget System

Personal budget tracker with cross-device sync. Stack: **React + Vite + Supabase + Netlify**.

You sign in once on any device with a magic link emailed to you; data syncs everywhere.

---

## Setup — read in order, ~30 minutes total

### 1. Local dev (5 min)

```bash
npm install
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY after step 2
npm run dev
```

The app will run at `http://localhost:5173` but auth won't work until step 2 is done.

### 2. Supabase setup (10 min)

1. Go to https://supabase.com → **New project**. Name it `magi-budget`. Pick a region close to Houston (us-east-1 / us-east-2 are fine). Set a strong DB password — save it somewhere.
2. Wait ~2 min for provisioning.
3. Go to **Project Settings → API**. Copy:
   - `Project URL` → paste into `.env` as `VITE_SUPABASE_URL`
   - `anon public` key → paste into `.env` as `VITE_SUPABASE_ANON_KEY`
4. Go to **SQL Editor → New query**. Paste the entire contents of `supabase/schema.sql`. Click **Run**. You should see "Success. No rows returned." This creates the tables + Row-Level Security policies.
5. Go to **Authentication → Providers**. Email should already be on. Toggle off "Confirm email" if you want skipping the confirmation step for yourself (only do this if you're the only user). For magic links, no extra config needed.
6. Go to **Authentication → URL Configuration**. Add your Netlify URL to "Redirect URLs" once you have it (step 3). For now, `http://localhost:5173` is allowed by default.

Test it: `npm run dev`, enter your email, check inbox for the link, click it. You should land back in the app, signed in.

### 3. Netlify deploy (10 min)

**Option A — GitHub-based (recommended):**

1. `git init && git add . && git commit -m "init"`
2. Create a new repo on github.com, push to it.
3. https://app.netlify.com → **Add new site → Import existing project** → pick your repo.
4. Build settings auto-detected from `netlify.toml`. Click **Deploy**.
5. After first deploy, go to **Site settings → Environment variables**. Add both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Trigger a redeploy.
6. Copy your `*.netlify.app` URL. Go back to Supabase → **Authentication → URL Configuration → Redirect URLs** and add it.

**Option B — drag and drop:**

1. `npm run build` → creates `dist/` folder.
2. Drag `dist/` into the Netlify dashboard.
3. You won't get auto-redeploys this way, so skip this unless you want a one-time deploy.

### 4. Add to iPhone home screen (1 min)

1. Open your Netlify URL in Safari (NOT Chrome — Chrome won't install PWAs on iOS).
2. Tap the share icon → **Add to Home Screen**.
3. Done. You now have a MAGI icon on your home screen that opens fullscreen, no browser chrome.

**Icons missing?** Drop two PNGs into `public/`:
- `public/icon-192.png` (192×192)
- `public/icon-512.png` (512×512)

If you don't add them, iOS uses a screenshot of the page as the icon — works fine, looks slightly less polished.

---

## Sharing the budget with someone else (future)

Schema is already wired for this. When you want to add a second user (e.g. a roommate or partner):

1. In `supabase/schema.sql`, uncomment the `collaborators` table block.
2. Update each RLS policy from:
   ```sql
   using (auth.uid() = user_id)
   ```
   to:
   ```sql
   using (
     auth.uid() = user_id
     OR auth.uid() IN (
       SELECT guest_id FROM collaborators WHERE owner_id = user_id
     )
   )
   ```
3. Add a UI to invite by email (the second user signs up first, then you add their `user_id` to `collaborators`).

No data migration needed — your existing rows stay yours and only the new policy decides who else can read them.

---

## Architecture notes

- **`src/lib/supabase.js`** — Supabase client, session-persistent.
- **`src/hooks/useSupabaseData.js`** — `useTable` for collections, `useGoal` for the single-row goal.
- **`src/components/Auth.jsx`** — magic link sign-in.
- **`src/components/MagiBudget.jsx`** — UI. Reads from hooks, writes through `.add()` / `.remove()`.
- **Optimistic updates** — `remove` updates UI first, rolls back on error. `add` waits for the server's row (it has the real UUID and timestamp).

## Untested

The schema, hooks, and UI compile and follow Supabase's documented API, but **I have not run this end-to-end**. Specifically untested:
- Magic link redirect from email back to the app (depends on Supabase Auth URL config being right).
- RLS policies on first insert (a brand-new user with no `goals` row — `useGoal` uses `.maybeSingle()` to handle this, but verify).
- Mobile Safari PWA install flow.

Run through steps 1–4, hit an error, paste it back to me, I'll patch it.

## Stack reasoning

- **Vite over CRA**: faster dev, smaller builds, actively maintained.
- **Supabase over Firebase**: Postgres + SQL you already know (CIS 4365), easier to extend with custom queries, RLS is simpler than Firestore security rules.
- **Magic link over password**: one less thing to leak, one less thing to remember.
- **Netlify over Vercel**: matches your existing brysonmagi.netlify.app pipeline.
