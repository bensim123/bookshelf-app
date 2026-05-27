# 📚 Bookshelf

A personal book library tracker that runs entirely as a web app — no app store, no installs, no build step. Add books by barcode scan or title/author/ISBN search. Track reading progress, take notes, log highlights, earn achievements, and sync across all your devices.

**Live app:** https://bensim123.github.io/bookshelf-app

---

## Features

- **Add books** via barcode scan (camera) or title/author/ISBN search — search results show **+** to add to Library and **💜** to add to Wishlist
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
- **Google Sign-In** — one tap login, no password
- **Friends** — add friends by email, view their library stats and achievements

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 (UMD via CDN — no build step) |
| JSX | Babel standalone (in-browser compilation) |
| Auth | Firebase Authentication (Google Sign-In) |
| Storage | Firebase Firestore (per-user cloud document) |
| Book data | Open Library API + Google Books API (no key required) |
| Barcode scanning | ZXing `@zxing/browser` via jsDelivr |
| AI (series/suggestions) | Groq `llama-3.3-70b-versatile` via Cloudflare Worker proxy |
| Fonts | Playfair Display + Nunito (Google Fonts) |
| Hosting | GitHub Pages |

Everything ships in a single `index.html` — no build pipeline, no npm, no node_modules.

---

## Setting Up Your Own Copy

There are **three external services** to configure: Firebase (auth + database), a Cloudflare Worker (AI proxy), and GitHub Pages (hosting). All have free tiers that are more than sufficient for personal use.

**Overview of what you'll do:**
1. Fork this repo
2. Create a Firebase project → get a config block → paste it into `index.html`
3. Get a Groq API key → deploy the Cloudflare Worker → paste the worker URL into `index.html`
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

Firebase provides Google Sign-In and the cloud database. It's free for personal use (Spark plan).

#### 2a. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**
3. Name it anything (e.g. `my-bookshelf`)
4. Disable Google Analytics (not needed) → **Create project**

#### 2b. Enable Google Sign-In

1. In the left sidebar, click **Authentication**
2. Click **Get started**
3. Under **Sign-in method**, click **Google** → toggle **Enable** → **Save**

#### 2c. Create the Firestore database

1. In the left sidebar, click **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode** → **Next**
4. Pick any region (closest to you) → **Enable**

#### 2d. Set Firestore security rules

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

    // Public profiles — any signed-in user can read; only the owner can write
    // Used for friend discovery and viewing a friend's library stats
    match /profiles/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Email → UID index — used for adding friends by email address
    match /emailToUid/{emailKey} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
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

#### 2e. Get your Firebase config

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

#### 2f. Paste the config into index.html

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

Replace those values with the ones you copied in step 2e.

---

### Step 3 — Cloudflare Worker (AI Features)

The AI features (series detection, reading suggestions) use [Groq](https://groq.com)'s free API. Because API keys must never be exposed in a browser, requests go through a small proxy you deploy to Cloudflare Workers. Both services have free tiers.

#### 3a. Get a Groq API key

1. Go to [console.groq.com](https://console.groq.com) and create a free account
2. Click **API Keys** → **Create API Key**
3. Copy and save the key — you won't be able to see it again

#### 3b. Create a Cloudflare account and deploy the worker

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
9. Click **Deploy**
10. Copy the worker URL — it looks like `https://bookshelf-ai.YOUR_SUBDOMAIN.workers.dev/`

#### 3c. Add the Groq API key as a Worker secret

The key is stored server-side so it's never exposed in the browser.

1. In your worker's dashboard, click **Settings** → **Variables**
2. Under **Environment Variables**, click **Add variable**
3. Set **Variable name** to `GROQ_API_KEY`
4. Set **Value** to the key you copied from Groq
5. Click **Encrypt** (makes it a secret) → **Save and deploy**

#### 3d. Update index.html with your worker URL

Open `index.html` and find:

```js
const AI_PROXY_URL = "https://calm-butterfly-1f95.bensim123.workers.dev/";
```

Replace the URL with the one you copied in step 3b.

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

Google Sign-In will refuse to work on a domain Firebase doesn't know about.

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

Open `http://localhost:3000`. The app needs a network connection for Google Sign-In on first use. `localhost:3000` is already in the worker's `ALLOWED_ORIGINS` and Firebase's authorized domains list by default.

If you changed the port, add it to both places.

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

**AI features show "failed" or nothing**
→ Check that `AI_PROXY_URL` in `index.html` matches your worker URL exactly, including the trailing slash. Also verify the `GROQ_API_KEY` secret is set in the worker. Check the worker's **Logs** tab in the Cloudflare dashboard for errors.

**AI works locally but not on GitHub Pages**
→ Your GitHub Pages URL isn't in `ALLOWED_ORIGINS` in `worker.js`. Add it and redeploy the worker.

**Data doesn't sync across devices**
→ Make sure you're signed in with the same Google account on both devices.

**Camera doesn't work for barcode scanning**
→ iOS will ask for camera permission the first time you tap Scan — tap Allow. Camera access requires HTTPS, which GitHub Pages provides automatically.

**App doesn't load offline**
→ Visit the page once on WiFi first to let the service worker cache everything.

**"Add to Home Screen" is greyed out**
→ Must use Safari on iOS. Chrome and Firefox do not support PWA install prompts on iOS.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Complete app — React, all components, all logic |
| `worker.js` | Cloudflare Worker source — AI proxy for Groq API |
| `manifest.json` | PWA metadata (name, icons, display mode, theme) |
| `icon.png` / `icon192.png` / `icon512.png` | App icons |
| `README.md` | This file |
| `BOOKSHELF_PROJECT_DOCS.md` | Full technical documentation for contributors |
| `DEPLOY_README.md` | Condensed deploy-only instructions |

---

## License

Personal project — not currently open for public distribution.
