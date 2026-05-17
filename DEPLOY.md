# Gratitude School — Deployment Guide
## From zero to live in ~20 minutes

---

## Step 1 — Set up the database in Supabase (5 mins)

1. Go to **supabase.com** and open your project
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Open the file `schema.sql` from this folder and copy everything inside
5. Paste it into the SQL editor and click **Run**
6. You should see "Success. No rows returned"

Now get your credentials:
7. Go to **Settings → API** in the left sidebar
8. Copy the **Project URL** (starts with https://...)
9. Copy the **anon / public** key (long string)

---

## Step 2 — Get your Anthropic API key (2 mins)

1. Go to **console.anthropic.com**
2. Click **API Keys** → **Create Key**
3. Copy the key (starts with sk-ant-...)

---

## Step 3 — Set up the project on your Mac (5 mins)

Open **Terminal** (search for it in Spotlight with Cmd+Space)

**Install Node.js** (if not already installed):
```
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 20
```

**Install the Vercel CLI:**
```
npm install -g vercel
```

**Navigate to this project folder:**
Drag the `gratitude-school` folder into the Terminal window after typing `cd ` (with a space), then press Enter.

**Install dependencies:**
```
npm install
```

**Create your .env file:**
```
cp .env.example .env
```
Open `.env` in any text editor and fill in your three values:
```
VITE_SUPABASE_URL=paste_your_supabase_url_here
VITE_SUPABASE_ANON_KEY=paste_your_supabase_anon_key_here
ANTHROPIC_API_KEY=paste_your_anthropic_api_key_here
```

**Test locally:**
```
npm run dev
```
Open the link it shows (usually http://localhost:3000) — the app should load!

---

## Step 4 — Push to GitHub (3 mins)

1. Go to **github.com** and click the **+** → **New repository**
2. Name it `gratitude-school`, keep it Private, click **Create repository**
3. Copy the commands GitHub shows you under "push an existing repository"

In Terminal (in your project folder):
```
git init
git add .
git commit -m "Gratitude School — initial build"
git remote add origin YOUR_GITHUB_URL_HERE
git branch -M main
git push -u origin main
```

---

## Step 5 — Deploy to Vercel (5 mins)

1. Go to **vercel.com** → **Add New Project**
2. Click **Import** next to your `gratitude-school` repo
3. Keep all settings as default, click **Deploy**
4. Wait ~1 minute for the build

**Add your environment variables:**
5. Go to your project → **Settings → Environment Variables**
6. Add these three variables (same values from your .env file):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
7. Go to **Deployments** and click **Redeploy** (so the variables take effect)

---

## Done! 🎉

Your app is now live at `your-project-name.vercel.app`

- Bookmark it on your phone's home screen
- Share the link with admin staff
- Any future updates: edit the code, push to GitHub, Vercel redeploys automatically

---

## Feature backlog (to build next)
- [ ] AI photo upload for student registration (admin photographs handwritten register)
- [ ] AI photo upload for receipt scanning
- [ ] WhatsApp receipt sharing (built in)
- [ ] Bulk student import from spreadsheet
- [ ] Parent-facing view (read-only, their child only)
