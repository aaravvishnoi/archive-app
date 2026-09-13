# Archive — your own private file storage

A minimal website where you sign in and upload/download/delete any file type,
from anywhere. Built with Next.js, deployed on Vercel, storage + auth via Supabase.

⚠️ Verify current free-tier limits yourself before relying on this for anything
important: supabase.com/pricing and vercel.com/pricing. These change over time
and I can't confirm live figures.

## 1. Create a Supabase project

1. Go to supabase.com → New project. Pick any name/region, set a database password
   (you won't need it day-to-day).
2. Once it's created, open **SQL Editor** → paste in the contents of
   `supabase-setup.sql` from this folder → Run. This creates a private storage
   bucket called `files` and locks it so each user can only see their own folder.
3. Go to **Project Settings → API**. Copy the **Project URL** and the
   **anon public** key — you'll need both in step 3.
4. (Optional but recommended for personal use) Go to **Authentication → Providers →
   Email** and turn off "Confirm email" if you don't want to click a confirmation
   link every time you create an account. If you leave it on, check your inbox
   after signing up.

## 2. Run it locally (optional, to test first)

```bash
npm install
cp .env.local.example .env.local
# edit .env.local and paste in your Supabase URL + anon key
npm run dev
```

Open http://localhost:3000, create an account, and try uploading a file.

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to vercel.com → New Project → import that repo.
3. In the project's **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (same values as your `.env.local`)
4. Deploy. Vercel gives you a `https://your-app.vercel.app` URL you can open
   from any device, or attach your own domain under **Settings → Domains**.

## Encryption

Files are encrypted in your browser (AES-256-GCM, key derived via
PBKDF2-SHA256) before they're ever sent to Supabase, using a **vault
passphrase** you set the first time you use the app — separate from your
login password.

- Supabase stores only ciphertext. Filenames themselves are **not**
  encrypted, only file contents.
- There is no password reset for the vault passphrase. If you forget it,
  your files can't be recovered by anyone — that's the point of
  zero-knowledge encryption, but it means the responsibility is entirely on
  you to remember or securely store it.
- Per your choice, the passphrase is kept in `sessionStorage` for the current
  browser tab only (cleared when you close the tab), so you won't be asked
  again every click, but you will be asked again in a new tab or after
  closing the browser.
- I used standard, well-reviewed building blocks (the browser's native Web
  Crypto API), but this hasn't been through a professional security audit.
  Treat it as solid protection against a cloud-storage provider or database
  breach, not as vetted, audited cryptographic software.
- If you already ran `supabase-setup.sql` before this feature existed, run
  `supabase-add-update-policy.sql` once too — it adds one policy the
  encryption check relies on.

## How it works

- **Auth**: Supabase handles sign-up/sign-in with email + password. Sessions are
  stored in cookies so they work with Next.js's server-rendered pages.
- **Storage**: Each file is uploaded straight from your browser to a private
  Supabase Storage bucket, inside a folder named after your user ID
  (`<your-user-id>/filename.ext`). Row-level security policies (set up by
  `supabase-setup.sql`) mean you can only ever read, upload to, or delete
  inside your own folder — even if someone else creates an account.
- **Download**: clicking the download icon asks Supabase for a short-lived
  signed link (valid 60 seconds) and downloads through that, since the bucket
  itself is private.

## Known limitations (honest list)

- No file preview — everything downloads rather than opens in-browser.
- No folders/subfolders, no sharing links, no versioning.
- No storage-quota display in the UI. You'd hit Supabase's plan limit with an
  upload error if you go over it.
- Large files (e.g. many GB video files) aren't the focus here — this is sized
  for the "few GB, general files" use case you described.

Any of these are addable later if you want them — just ask.
