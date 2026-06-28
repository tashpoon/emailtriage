# Email Triage — Setup Guide

## 1. Google Cloud setup

1. Go to https://console.cloud.google.com → New project (e.g. "email-triage")
2. **Enable APIs**: APIs & Services → Library → enable **Gmail API**
3. **OAuth consent screen**: External → fill in App name "Email Triage", your email for support/developer contacts, add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
   - Add yourself as a test user (stays in "Testing" mode — fine for personal use)
4. **Credentials** → Create credentials → OAuth 2.0 Client ID → Web application
   - Name: "Email Triage Web"
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `https://YOUR-APP.vercel.app` (add after deploying)
   - No redirect URIs needed
5. Copy the **Client ID** — looks like `123456789.apps.googleusercontent.com`

## 2. Anthropic API key

Get one at https://console.anthropic.com/ → API Keys → Create Key

## 3. Local development

```bash
cd email-triage
cp .env.example .env.local
# Edit .env.local and fill in both keys

npm install
npm run dev
# Open http://localhost:3000
```

## 4. PWA icons

Place two PNG files in `public/icons/`:
- `icon-192.png` — 192×192 px
- `icon-512.png` — 512×512 px

Quick option: https://favicon.io/emoji-favicons/ → pick ✉️ → download → rename files

## 5. Deploy to Vercel

```bash
npm install -g vercel
vercel          # follow prompts, link to your project
```

In the Vercel dashboard → your project → Settings → Environment Variables, add:
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = your Google client ID
- `ANTHROPIC_API_KEY` = your Anthropic key

Then redeploy: `vercel --prod`

Go back to Google Cloud Console and add your `https://YOUR-APP.vercel.app` to the authorized JS origins.

## 6. Install to phone home screen

On iPhone (Safari): open your Vercel URL → Share → "Add to Home Screen"
On Android (Chrome): open URL → ⋮ menu → "Add to Home Screen"

---

## How it works

| Gesture | Action |
|---------|--------|
| Swipe right | Archive (removes INBOX label) |
| Swipe left | Delete (moves to Trash — 30-day recovery) |
| Swipe up | Add to in-app to-do list + archive |
| Swipe down | Opens label picker → apply label + archive |

After every swipe an **Undo** toast appears for ~4.5 seconds.

To-do items older than 7 days are flagged with a red badge and sorted to the top.
