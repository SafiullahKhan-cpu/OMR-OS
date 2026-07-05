# MCQ Mastery OS (OMR Edition)

A lightweight OMR-first study operating system for medical MCQ mastery. It stores answer keys,
explanations, source references, tags, progress, notes, mistakes, and analytics without storing
question statements or options.

This version requires **signing in with a Google account** - there is no anonymous/Guest mode.
Everything is tied to your Google identity in **Supabase**, and syncs to the cloud **automatically**
in the background (no "Enable Cloud Sync" button, no manual push/pull required day to day).

## Files

- `index.html` - the entire app: markup, styles, and logic, in one file.
- `schema.sql` - run this once in your Supabase project to create the tables and security rules.

## Important: this needs to run over http(s), not by double-clicking the file  

Google Sign-In works by redirecting your browser to Google, then back to your app's URL. Google and
Supabase both require that return address to be a real `http://` or `https://` URL - browsers and
Google's login screen do not allow redirecting back to a `file://...` path for security reasons.

So **you do need *some* web server in front of `index.html`** - but it does **not** have to be
GitHub Pages, and it does **not** have to be on the public internet. Running it on your own computer
via `http://localhost` (Step 6 below) satisfies this requirement and needs no GitHub account, no
deployment, and no internet-facing hosting at all. GitHub Pages is offered as an alternative if you
want a permanent link you can open from any device.

---

## Part 1: Beginner Setup Guide

Total time: about 20 minutes. You'll touch three things: Google Cloud (to create a login client),
Supabase (database + auth), and the app file itself.

### Step 1 - Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is enough).
2. Click **New Project**. Pick any name (e.g. "mcq-mastery"), set a database password (you won't
   need it directly - the app never uses it), pick the region closest to you, and click
   **Create new project**. Wait 1-2 minutes for it to finish provisioning.

### Step 2 - Create the database tables

1. In your project, open the **SQL Editor** from the left sidebar -> **New query**.
2. Open `schema.sql` from this repo, copy its entire contents, paste it in, and click **Run**.
3. Open **Table Editor** and confirm you see four tables: `profiles`, `chunks`, `questions`,
   `attempts`.

### Step 3 - Create a Google OAuth client

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project (or
   pick an existing one) from the project dropdown at the top.
2. Go to **APIs & Services -> OAuth consent screen**. Choose **External**, fill in an app name and
   your email in the required fields, and save. You can leave it in "Testing" mode and add your own
   Google account under **Test users** - that's enough for personal/family use.
3. Go to **APIs & Services -> Credentials -> Create Credentials -> OAuth client ID**.
4. Application type: **Web application**. Give it any name.
5. Under **Authorized redirect URIs**, add exactly this (with your own project ref):
   ```
   https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
   ```
   You'll find `YOUR-PROJECT-REF` in your Supabase project URL from Step 1 (Settings -> API ->
   Project URL).
6. Click **Create**. Copy the **Client ID** and **Client Secret** shown - you'll need both next.

### Step 4 - Turn on Google sign-in in Supabase

1. In Supabase, go to **Authentication -> Providers** (or **Authentication -> Sign In / Providers**
   depending on your project's dashboard version).
2. Find **Google** in the list and enable it.
3. Paste the **Client ID** and **Client Secret** from Step 3, then **Save**.
4. Go to **Authentication -> URL Configuration**. Add every address you'll open the app from to
   **Redirect URLs** - for example both of these, if you plan to try both:
   ```
   http://localhost:8080
   https://your-username.github.io/your-repo-name/
   ```
   (Adjust the port/path to whatever you actually use - see Steps 6/7.)

### Step 5 - Get your Supabase API keys and plug them into index.html

1. In Supabase, go to **Settings -> API**.
2. Copy the **Project URL** (`https://abcdefgh.supabase.co`) and the **anon / public** key (starts
   with `eyJ...`). Never use the **service_role** key here - only the anon/public one.
3. Open `index.html` in a text editor, find these two lines near the top of the `<script>` block,
   and replace the placeholders:
   ```js
   const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
   const SUPABASE_ANON_KEY = "replace-with-your-anon-public-key";
   ```
4. Save the file.

### Step 6 - Run it locally (no GitHub needed)

From a terminal, `cd` into the folder containing `index.html` and run **one** of these (pick
whichever you have installed):

```bash
# Python (usually already installed on Mac/Linux; on Windows: python)
python3 -m http.server 8080

# Node.js
npx serve . -l 8080
```

Then open `http://localhost:8080` in your browser. This is a real `http://` URL, so Google Sign-In
works. Leave the terminal window open while you use the app; close it (Ctrl+C) when you're done.

Make sure `http://localhost:8080` is in Supabase's **Redirect URLs** list from Step 4.

### Step 7 (optional) - Host it permanently on GitHub Pages

If you'd rather have a stable link you can open from your phone or another computer:

1. Create a new **public** GitHub repository and upload `index.html` (with your real keys already
   filled in from Step 5).
2. In the repo, go to **Settings -> Pages**, set **Source** to "Deploy from a branch", branch
   `main`, folder `/ (root)`, and **Save**.
3. After a minute, the same page will show your live URL, e.g.
   `https://your-username.github.io/your-repo-name/`.
4. Add that exact URL to Supabase's **Redirect URLs** (Step 4) if you haven't already.

### Step 8 - Sign in

Open whichever URL you set up (localhost or GitHub Pages) and click **Continue with Google**. After
you approve, you're dropped straight into the app - already synced. There's nothing else to turn on.

### Troubleshooting

- **"Set real SUPABASE_URL and SUPABASE_ANON_KEY..."** - you skipped Step 5.
- **Google shows "redirect_uri_mismatch"** - the redirect URI in your Google Cloud OAuth client
  (Step 3) must be exactly `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` - not your app's
  own URL. The app's own URL goes in Supabase's *Redirect URLs* list (Step 4), which is a separate
  setting from Google's.
- **You're redirected back but land on a blank/errored page, or nothing happens after approving
  Google** - your app's exact URL (including the port, e.g. `http://localhost:8080`) isn't in
  Supabase's **Redirect URLs** list. Add it and try again.
- **"Access blocked: this app's request is invalid"** from Google - usually means the OAuth consent
  screen (Step 3.2) isn't fully filled in, or your account isn't added under "Test users" while the
  app is in Testing mode.
- **"Sync failed: new row violates row-level security policy"** - `schema.sql` wasn't fully run, or
  you're pointing at a different Supabase project than the one you configured. Re-check Steps 2 and
  5 use the same project.
- **Opening `index.html` directly (double-click) shows the sign-in screen but the button does
  nothing / errors out** - this is the `file://` limitation described above. Use Step 6 or Step 7.

### Updating the app later

If you download a newer `index.html`, copy your `SUPABASE_URL` and `SUPABASE_ANON_KEY` values into
the new file before using it - a fresh copy will have the placeholders again.

### If you were using an older, anonymous/Guest-mode version of this app

This version has no local Guest Mode and does not read data saved by older versions - your Google
account starts with an empty library. If you have data in an older version you want to keep, open
that older version first and use **Export Profile** (Settings) to save a JSON copy before switching,
then re-import the questions via the Import tab once you're signed in here.

---

## Part 2: Security Model

Every table's Row Level Security policy only allows a signed-in Google user to read or write their
**own** rows (`auth.uid() = user_id`) - there is no shared or anonymous access, and no arbitrary
profile-ID collisions like earlier versions of this app had. Two different people signing in with
two different Google accounts, even on the same Supabase project, cannot see each other's data.

What's still worth knowing:
- Your Supabase **anon key** is public by design (it ships inside the page's JS) - it identifies
  your project but grants no access on its own; RLS is what enforces per-user isolation. Never put
  the **service_role** key in this file.
- Your Google OAuth **Client Secret** (Step 3) lives only in Supabase's dashboard, never in
  `index.html` - keep it that way.
- Anyone can *open* your app's URL and see the "Continue with Google" screen; they simply can't see
  or touch your data without signing into your Google account.

## Import Format

Paste or upload either a JSON array or an object with a `questions` array.

```json
[
  {
    "id": "BIO-GLY-125",
    "source": "Lippincott Biochemistry",
    "edition": "8th Edition",
    "chapter": "Glycolysis",
    "page": 32,
    "questionNumber": 125,
    "correctAnswer": "D",
    "explanation": "Phosphofructokinase-1 is the rate-limiting enzyme of glycolysis.",
    "difficulty": "Medium",
    "tags": ["Biochemistry", "Metabolism", "Glycolysis"],
    "imageUrl": ""
  }
]
```

Required fields: `id`, `source`, `chapter`, `questionNumber`, `correctAnswer`, `explanation`, `tags`.

When you save the import as a chunk, you can also name it and (optionally) attach a **resource
link** - a URL to the textbook PDF, Drive folder, course page, etc. that the questions came from.
It must start with `http://` or `https://`; anything else is rejected with a warning instead of
being saved.

## Solving a Chunk

Every chunk you import shows up in the Library with a **Solve Chunk** button. Clicking it opens a
checklist of every question in that chunk (all checked by default) plus its resource link if you set
one. You can:

- Solve the whole chunk as-is, or uncheck any questions you want to skip for this round.
- Send your selection to **Practice Selected** - untimed, instant feedback, Skip button, and an
  end-of-session summary.
- Send your selection to **Quiz Selected** - all questions presented at once, graded on Submit.

The Quiz Builder also has its own "Chunk" dropdown for filter-based quizzes scoped to one chunk.

## Automatic Sync Details

There is no on/off switch - as long as you're signed in, every import, practice answer, and quiz
submission pushes to Supabase in the background right after it happens. The app also quietly pulls
from the cloud once a minute while the tab is visible, so changes made on another signed-in device
show up here without you doing anything. "Sync Now" / "Pull from Cloud" in Settings are there only
if you want to force one immediately (e.g. right after finishing a session on your phone).

Notes, bookmarks, and spaced-repetition schedules stay local to the device they were created on;
only chunks, questions, and attempts are synced.

## Current Scope

Implemented:

- Mandatory Google sign-in via Supabase Auth; no anonymous/Guest mode.
- Automatic background sync (push after every action, pull every 60s while open), plus manual
  Sync Now / Pull From Cloud for on-demand use.
- Drag/drop, file, and paste JSON import with duplicate/schema validation.
- Chunks, folders, global search, notes, bookmarks, optional per-chunk resource links.
- A per-chunk question picker to solve a chunk wholesale or skip specific questions, feeding
  straight into Practice or Quiz mode.
- OMR practice (untimed, instant feedback, Skip button, position indicator, end-of-session summary)
  and custom quiz builder (untimed-or-timed, graded on Submit), with in-progress quiz auto-restore.
- Result analytics, mistake diary, SM-2 inspired review scheduling.
- Dashboard, heatmap, topic analytics, knowledge graph, study planner.
- Profile export, manual local backup with corruption-safe restore.

Designed for expansion:

- OCR/PDF import.
- Flashcards and AI tutor.
- Collaborative study groups (would need explicit sharing between accounts - today's RLS is
  strictly single-owner per row).

## Changes In This Update (Google login + automatic sync)

- **Mandatory Google sign-in, no anonymous mode**: replaced the local "Guest"/multi-profile switcher
  with Supabase Auth's Google OAuth. Your identity is now your Google account (`auth.uid()`), not an
  arbitrary local string.
- **Real per-user data isolation**: `schema.sql`'s Row Level Security policies now check
  `auth.uid() = user_id` on every table, closing the earlier "anyone with the anon key can read/write
  every profile" gap entirely. Two different Google accounts can never see each other's rows.
- **Sync is automatic, no toggle**: removed the "Enable Cloud Sync" button. Every mutating action
  syncs immediately in the background, and the app also polls the cloud once a minute for changes
  made elsewhere, so a second device's data shows up without a manual "Pull" click.
- **Local storage is now per-account**: cached data is keyed by the signed-in user's ID
  (`mcqMasteryOs.v2:<uid>`), so multiple Google accounts can safely be used on the same browser
  without their local caches colliding (older versions used one shared local key for everyone).
- **No `file://` support**: because Google's OAuth redirect requires a real `http(s)` URL, the app
  now needs to be served (locally via `python -m http.server`/`npx serve`, or hosted, e.g. GitHub
  Pages) rather than opened by double-clicking the file. See Part 1 above.

## Earlier Bug Fixes (carried over)

- **Duplicate practice attempts**: choices now lock after the first answer, preventing double-logged
  attempts and double SRS updates.
- **Cross-profile quiz/attempt leakage**: quizzes are tagged with the profile that started them and
  discarded (with a warning) on account switch - now further protected by per-account local storage
  keys.
- **Silent quiz overwrite**: starting a new quiz while one is in progress now asks for confirmation.
- **Stale session survives "Clear Local Data"**: the in-progress-quiz key is cleared together with
  the rest of local data, and clearing now re-pulls fresh data from Supabase immediately after.
- **Unbounded practice loop with no feedback**: added a "Question X of N" indicator and an
  end-of-session summary for curated selections.
- **Resource link XSS hardening**: resource links must start with `http://` or `https://`, enforced
  both client-side and via a database constraint.
