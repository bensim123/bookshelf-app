# 📚 Bookshelf

A personal book library tracker that runs entirely as a web app — no app store, no installs, no build step. Add books by barcode scan or title/author/ISBN search. Track reading progress, take notes, log highlights, earn achievements, and sync across all your devices.

**Live app:** https://bensim123.github.io/bookshelf-app

---

## Features

- **Add books** via barcode scan (camera) or title/author/ISBN search — results pull from Open Library, Google Books, and Barnes & Noble; search results show **+** to add to Library and **💜** to add to Wishlist
- **Track status** — Owned, Reading, Read, DNF, Wishlist
- **Reading progress** — page numbers for physical/ebook, minutes for audiobooks
- **Auto-saving detail view** — changes to any field save automatically; no Save button required
- **Context menu** — right-click or long-press any book card for quick actions: Open, change status, add to shelf, find series, share, delete
- **Multi-format per title** — own a book in multiple formats (physical, ebook, audiobook) on one record
- **Format tracking** — Physical (paperback/hardcover/mass market), E-Book, Audiobook
- **Notes & highlights** — personal annotations per book
- **Loan tracker** — who has your book and since when
- **Custom shelves** — organize beyond status (e.g. "Beach Reads", "Gift Ideas")
- **Smart Shelves** — dynamic shelves that auto-update as your library changes; filter by title, author, genre, year, pages, rating, and status; save any combo as a named shelf
- **Series detection** — automatically checks for companion books when you add a title
- **Stats screen** — books by status/format, reading streak, pages read, hours listened
- **Achievements** — 60 badges across 6 categories with XP and level system
- **Monthly Challenges** — a unique challenge each month from May 2026 through April 2031; completing a challenge awards bonus XP
- **AI suggestions** — personalized reading picks or mood-based recommendations (never suggests books already in your library)
- **Import / Export CSV** — Bookshelf CSV, Goodreads, or StoryGraph
- **Dark and light themes** — persists across sessions
- **Works offline** after first load (service worker caching)
- **Multi-device sync** via Firebase Firestore
- **Flexible sign-in** — Google, Microsoft (SSO), or email/password with a full sign-up flow; password reset by email
- **Account management** — delete your account from the profile menu; 90-day soft-delete window lets you sign back in to restore everything before it's permanently removed
- **Friends** — add friends by email search or share a personal link (opens the native share sheet on iOS/Android so you can send it via Messages, WhatsApp, AirDrop, etc.); friend requests trigger an email notification to the recipient; view friends' library stats, achievements, and wishlists
- **Buy links** — every wishlist book shows one-tap links to Amazon, Barnes & Noble, and Half Price Books

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 (UMD via CDN — no build step) |
| JSX | Babel standalone (in-browser compilation) |
| Auth | Firebase Authentication (Google, Microsoft, email/password) |
| Storage | Firebase Firestore (per-user cloud document) |
| Book data | Open Library API + Google Books API + Barnes & Noble (no key required) |
| Barcode scanning | ZXing `@zxing/browser` via jsDelivr |
| AI (series/suggestions) | Groq `llama-3.3-70b-versatile` via Cloudflare Worker proxy |
| Email notifications | Resend (friend-request emails, free tier: 3,000/month) |
| Fonts | Playfair Display + Nunito (Google Fonts) |
| Hosting | GitHub Pages |

Everything ships in a single `index.html` — no build pipeline, no npm, no node_modules.

---

## Setting Up Your Own Copy

There are **five external services** to configure: Firebase (auth + database), Groq (AI), Resend (email), a Cloudflare Worker (proxy for Groq and Resend), and GitHub Pages (hosting). All have free tiers that are more than sufficient for personal use.

**Overview of what you'll do:**
1. Fork this repo
2. Create a Firebase project → get a config block → paste it into `index.html`
3. Get a Groq API key and a Resend API key → deploy the Cloudflare Worker → paste the worker URL into `index.html`
4. Enable GitHub Pages on your fork
5. Add your GitHub Pages domain to Firebase's allowed list

---

### Step 1 — Fork the Repository

1. Click **Fork** at the top-right of this GitHub page
2. Choose your account as the destination
3. Clone your fork locally (optional — you can also edit files directly in the GitHub UI):
   ```bash
   git clone https://github.com/YOUR_USERNAME/bookshelf-app.git
   cd bookshelf-app
   ```

---

### Step 2 — Firebase Setup

Firebase provides sign-in and the cloud database. It's free for personal use (Spark plan).

#### 2a. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**
3. Name it anything (e.g. `my-bookshelf`)
4. Disable Google Analytics (not needed) → **Create project**

#### 2b. Enable sign-in providers

1. In the left sidebar, click **Authentication** → **Get started**
2. Under **Sign-in method**, enable the providers you want:

   **Google** (recommended — one-tap sign-in)
   - Click **Google** → toggle **Enable** → add a support email → **Save**

   **Email/Password** (lets users create an account with a password)
   - Click **Email/Password** → toggle **Enable** on the first option → **Save**
   - Leave the "Email link (passwordless)" second toggle off

   **Microsoft** (optional — for Outlook/Microsoft account sign-in)
   - Requires an Azure App Registration — see step 2c

#### 2c. (Optional) Set up Microsoft sign-in

Skip this step if you only want Google and email/password.

1. Go to [portal.azure.com](https://portal.azure.com) → search **App registrations** → **New registration**
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: leave blank for now → **Register**
2. Copy the **Application (client) ID**
3. Go to **Certificates & secrets** → **New client secret** → **Add** → copy the **Value**
4. In Firebase Console → Authentication → Sign-in method → **Microsoft** → **Enable** → paste Client ID and Client Secret
5. Copy the **OAuth redirect URI** Firebase shows you (looks like `https://your-project.firebaseapp.com/__/auth/handler`)
6. Back in Azure → your app → **Authentication** → **Add a platform → Web** → paste the redirect URI → **Configure** → **Save**

#### 2d. Create the Firestore database

1. In the left sidebar, click **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode** → **Next**
4. Pick any region (closest to you) → **Enable**

#### 2e. Set Firestore security rules

1. In Firestore, click the **Rules** tab
2. Replace the entire contents with the following and click **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Private user data — only the signed-in user can read or write their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Books subcollection — each book is its own document; same ownership rule
    match /users/{userId}/books/{bookId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Public profiles — any signed-in user can read; only the owner can write
    // Used for friend discovery and viewing a friend's library stats
    match /profiles/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Email → UID index — used for adding friends by email address
    // Write is allowed only when the UID being stored matches the signed-in user,
    // preventing anyone from overwriting another user's email mapping.
    match /emailToUid/{emailKey} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.resource.data.uid == request.auth.uid;
    }

    // Friend requests
    match /friendRequests/{requestId} {
      // Only the sender or recipient can read a request
      allow read: if request.auth != null && (
        resource.data.toUid   == request.auth.uid ||
        resource.data.fromUid == request.auth.uid
      );
      // Anyone signed in can create a request, but must be the sender
      allow create: if request.auth != null
                    && request.resource.data.fromUid == request.auth.uid;
      // Only the recipient can accept (update status)
      allow update: if request.auth != null
                    && resource.data.toUid == request.auth.uid;
      // Either party can delete (decline or clean up after acceptance)
      allow delete: if request.auth != null && (
        resource.data.toUid   == request.auth.uid ||
        resource.data.fromUid == request.auth.uid
      );
    }

  }
}
```

#### 2f. Get your Firebase config

1. In the Firebase console, click the **gear icon** → **Project settings**
2. Scroll down to **Your apps** → click **Add app** → choose the **Web** icon (`</>`)
3. Register the app (nickname doesn't matter, skip "Firebase Hosting")
4. Copy the `firebaseConfig` object — it looks like:
   ```js
   const firebaseConfig = {
     apiKey:            "AIza...",
     authDomain:        "your-project.firebaseapp.com",
     projectId:         "your-project",
     storageBucket:     "your-project.firebasestorage.app",
     messagingSenderId: "123456789",
     appId:             "1:123456789:web:abc123"
   };
   ```

#### 2g. Paste the config into index.html

Open `index.html` and find this block near the top of the `<script type="text/babel">` section (around line 203):

```js
const FIREBASE_CONFIG = {
  apiKey:            "...",
  authDomain:        "...",
  projectId:         "...",
  storageBucket:     "...",
  messagingSenderId: "...",
  appId:             "..."
};
```

Replace those values with the ones you copied in step 2f.

---

### Step 3 — Cloudflare Worker (AI Features + Email Notifications)

The AI features (series detection, reading suggestions) and friend-request email notifications share a single Cloudflare Worker. The Worker proxies AI requests to Groq and sends notification emails via Resend. All three services have free tiers.

#### 3a. Get a Groq API key

1. Go to [console.groq.com](https://console.groq.com) and create a free account
2. Click **API Keys** → **Create API Key**
3. Copy and save the key — you won't be able to see it again

#### 3b. Get a Resend API key (for friend-request email notifications)

1. Go to [resend.com](https://resend.com) and create a free account (3,000 emails/month free)
2. Click **API Keys** → **Create API Key**
3. Copy and save the key — you won't be able to see it again

> **Note:** Resend's free tier sends from `onboarding@resend.dev`. You can optionally add a custom domain later from the Resend dashboard for a branded from-address.

#### 3c. Create a Cloudflare account and deploy the worker

1. Go to [cloudflare.com](https://cloudflare.com) and create a free account
2. In the dashboard, click **Workers & Pages** in the left sidebar
3. Click **Create** → **Create Worker**
4. Give it a name (e.g. `bookshelf-ai`)
5. Click **Deploy** (you'll edit the code next)
6. On the next screen, click **Edit code**
7. Delete all the placeholder code and paste in the entire contents of `worker.js` from this repo
8. Find the `ALLOWED_ORIGINS` set at the top of the file and update it with your GitHub Pages URL:
   ```js
   const ALLOWED_ORIGINS = new Set([
     "https://YOUR_USERNAME.github.io",  // ← change this
     "http://localhost:3000",
   ]);
   ```
9. Also update `APP_URL` to point to your deployed app:
   ```js
   const APP_URL = "https://YOUR_USERNAME.github.io/bookshelf-app";
   ```
10. Click **Deploy**
11. Copy the worker URL — it looks like `https://bookshelf-ai.YOUR_SUBDOMAIN.workers.dev/`

> **Note — keeping the worker up to date:** The worker is not deployed automatically when you push to GitHub. Any time `worker.js` changes in the repo, you need to repeat steps 6–10 above (paste the new code, deploy) in your Cloudflare dashboard.

#### 3d. Add the API keys as Worker secrets

Both keys are stored server-side so they're never exposed in the browser.

1. In your worker's dashboard, click **Settings** → **Variables**
2. Under **Environment Variables**, click **Add variable**
3. Add `GROQ_API_KEY` → paste your Groq key → **Encrypt** → **Save and deploy**
4. Add `RESEND_API_KEY` → paste your Resend key → **Encrypt** → **Save and deploy**

> If you skip the Resend key, AI features still work — email notifications just won't send (they fail silently so the app isn't affected).

#### 3e. Update index.html with your worker URL

Open `index.html` and find:

```js
const AI_PROXY_URL = "https://calm-butterfly-1f95.bensim123.workers.dev/";
```

Replace the URL with the one you copied in step 3c.

---

### Step 4 — Deploy to GitHub Pages

1. Push your updated `index.html` (and any other changed files) to your fork's `main` branch
2. In your repo on GitHub, go to **Settings** → **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Choose branch: `main`, folder: `/ (root)` → **Save**
5. After a minute or two, your app is live at:
   ```
   https://YOUR_USERNAME.github.io/bookshelf-app
   ```
   (or whatever you named your repo)

---

### Step 5 — Authorize your domain in Firebase

Firebase will refuse sign-in attempts from any domain it doesn't know about.

1. Back in the Firebase console, go to **Authentication** → **Settings** → **Authorized domains**
2. Click **Add domain**
3. Enter `YOUR_USERNAME.github.io`
4. Click **Add**

That's it — your app is fully configured and live.

---

## Running Locally

```bash
python3 -m http.server 3000
```

Open `http://localhost:3000`. The app needs a network connection for sign-in on first use. `localhost:3000` is already in the worker's `ALLOWED_ORIGINS` and Firebase's authorized domains list by default.

If you changed the port, add it to both places.

---

## Sharing with Friends & Family

Multiple people can use the same deployment — each person signs in with their own account and gets a completely separate, private library.

**What each new person needs to do:**

1. Open your GitHub Pages URL in Safari on their phone (or any browser on desktop)
2. Sign in with Google, Microsoft, or create an email/password account
3. Their library is created automatically — it's private to them

**What you need to do when adding someone new:**

1. Go to Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Click **Add domain** and enter the domain they'll be using

   - If they're using your URL (e.g. `bensim123.github.io`) — nothing to do, it's already authorized
   - If they're running their own fork at a different GitHub Pages URL, add their `theirusername.github.io`

**Cost:** The Firebase free tier (Spark plan) supports thousands of daily active users before any charges apply. For friends and family, you will never pay anything:

| What | Free allowance | Typical usage per person/day |
|------|---------------|------------------------------|
| Firestore reads | 50,000 / day | ~3 |
| Firestore writes | 20,000 / day | ~5 |
| Firestore storage | 1 GB total | ~200 KB per user |
| AI requests (Cloudflare) | 100,000 / day | occasional |

**Using the Friends feature:**

Once multiple people are using the app, they can connect via the profile icon → **Friends** → **Add Friend**. From there they can search by email address or tap **Share your Bookshelf link** to send a personalised friend-request URL via Messages, WhatsApp, AirDrop, or any other app. When the recipient opens the link they get a one-tap "Add as friend" prompt. Connected friends can see each other's reading stats, achievements, and wishlists.

---

## Installing to Your iPhone Home Screen

1. Open your GitHub Pages URL in **Safari** (must be Safari — Chrome doesn't support this on iOS)
2. Tap the **Share** button (box with an arrow, in the bottom toolbar)
3. Scroll down and tap **Add to Home Screen**
4. Name it **Bookshelf** → tap **Add**

The app launches fullscreen with no browser chrome, feels like a native app, and works offline after the first load.

---

## Updating the App

Edit `index.html` and push to `main`. GitHub Pages redeploys automatically within a minute or two. The service worker version number is bumped on each release so users' caches refresh on next load.

---

## Troubleshooting

**Sign-in does nothing / "auth/unauthorized-domain" error**
→ Your hosting domain isn't in Firebase's list. Go to Firebase Console → Authentication → Settings → Authorized domains → Add domain.

**"Create Account" button does nothing or shows an error**
→ Make sure Email/Password is enabled in Firebase Console → Authentication → Sign-in method → Email/Password → Enable (first toggle only).

**Forgot password email never arrives**
→ Check spam/junk. The reset email comes from Firebase's no-reply address. Also confirm Email/Password is enabled in Firebase Console.

**Account deletion doesn't complete / "requires-recent-login" error**
→ This shouldn't occur in normal use since deletion is confirmed immediately after sign-in. If it does, sign out and sign back in, then delete your account again.

**AI features show "failed" or nothing**
→ Check that `AI_PROXY_URL` in `index.html` matches your worker URL exactly, including the trailing slash. Also verify the `GROQ_API_KEY` secret is set in the worker. Check the worker's **Logs** tab in the Cloudflare dashboard for errors.

**AI shows "Too many requests — please wait a moment"**
→ The worker rate-limits AI calls to one per IP per 30 seconds to protect the Groq free-tier quota. Wait a moment and try again. This only affects rapid repeated taps; normal use is unaffected.

**AI works locally but not on GitHub Pages**
→ Your GitHub Pages URL isn't in `ALLOWED_ORIGINS` in `worker.js`. Add it and redeploy the worker.

**Friend request was sent but recipient got no email**
→ The `RESEND_API_KEY` secret may not be set in your Cloudflare Worker. Go to the worker dashboard → Settings → Variables → add `RESEND_API_KEY` (encrypted). Also make sure you've deployed the latest `worker.js`. The friend request itself is still saved in Firestore — email is a bonus notification only.

**Friend profile shows "Profile access was blocked"**
→ Your Firestore rules don't include the `profiles` collection. Paste the full ruleset from Step 2e above into Firebase Console → Firestore → Rules → Publish.

**"Share your Bookshelf link" doesn't open a share sheet on desktop**
→ The Web Share API is only available on mobile browsers (iOS Safari, Chrome Android). On desktop the button copies the link to your clipboard instead — paste it into any message or email manually.

**Friend profile shows "hasn't opened Bookshelf yet"**
→ The friend needs to open the app at least once after you both signed up. Their profile is written automatically on first login.

**Friend profile shows "Stats not synced yet"**
→ The friend's profile exists but their library stats haven't been published. They need to open the app while signed in — stats sync automatically within a few seconds of opening.

**"Add Friend" search can't find someone by email**
→ They need to have signed into the app at least once so their email is registered. Ask them to open the app and sign in, then try the search again.

**Data doesn't sync across devices**
→ Make sure you're signed in with the same account on both devices. If you used Google on one device and Microsoft on another with the same email, those are separate accounts — pick one and stick with it.

**Camera doesn't work for barcode scanning**
→ iOS will ask for camera permission the first time you tap Scan — tap Allow. Camera access requires HTTPS, which GitHub Pages provides automatically.

**App doesn't load offline**
→ Visit the page once on WiFi first to let the service worker cache everything.

**"Add to Home Screen" is greyed out**
→ Must use Safari on iOS. Chrome and Firefox do not support PWA install prompts on iOS.

**"Add Friend" contact search finds someone but can't send a request**
→ Check that the Firestore `friendRequests` collection rules are published (Step 2e). Also confirm the recipient hasn't deleted their account.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Complete app — React, all components, all logic |
| `worker.js` | Cloudflare Worker source — AI proxy (Groq) + friend-request email notifications (Resend) |
| `manifest.json` | PWA metadata (name, icons, display mode, theme) |
| `icon.png` / `icon192.png` / `icon512.png` | App icons |
| `README.md` | This file |
| `BOOKSHELF_PROJECT_DOCS.md` | Full technical documentation for contributors |
| `DEPLOY_README.md` | Condensed deploy-only instructions |

---

## License

Personal project — not currently open for public distribution.
