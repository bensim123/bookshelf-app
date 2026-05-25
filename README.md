# 📚 Bookshelf

A personal book library tracker that runs as a web app — no app store, no installs. Add books by barcode scan or search. Track reading progress, take notes, log highlights, and earn achievements.

**Live app:** https://bensim123.github.io/bookshelf-app

---

## Features

- **Add books** via barcode scan (camera) or title/author/ISBN search
- **Track status** — Owned, Reading, Read, DNF, Wishlist
- **Reading progress** — page numbers for physical/ebook, minutes for audiobooks
- **Multi-format per title** — own a book in multiple formats (physical, ebook, audiobook) on one record
- **Format tracking** — Physical (paperback/hardcover/mass market), E-Book, Audiobook
- **Notes & highlights** — personal annotations per book
- **Loan tracker** — who has your book and since when
- **Custom shelves** — organize beyond status (e.g. "Beach Reads", "Gift Ideas")
- **Smart Shelves** — dynamic shelves that auto-update as your library changes; filter by title, author, genre, year, pages, rating, and status with =, ≥, ≤ operators; save any combo as a named shelf
- **Series detection** — automatically checks for companion books when you add a title; shows a "Checking for series companions…" notice while running; re-trigger anytime from the book detail screen
- **Stats screen** — books by status/format, reading streak, pages read, hours listened
- **Achievements** — 57 badges across 6 categories with XP and level system
  - Reading milestones, genre mastery (Sci-Fi, Fantasy, Mystery, Thriller, Non-Fiction, History), format achievements, depth tracking, and more
- **Achievement comparison** — compare your earned badges with friends side-by-side
- **AI suggestions** — personalized reading picks or mood-based recommendations (never suggests books already in your library)
- **Import / Export CSV** — export your library to CSV (opens in Excel/Sheets); import from Bookshelf CSV, Goodreads, or StoryGraph with step-by-step instructions
- **Dark and light themes** — persists across sessions
- **Works offline** after first load (service worker caching)
- **Multi-device sync** via Firebase Firestore — your library follows you everywhere
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

## Running Locally

```bash
python3 -m http.server 3000
```

Open `http://localhost:3000`. The app requires a network connection for Google Sign-In on first launch.

---

## Firebase Setup (for contributors)

The app uses Firebase for auth and data storage. The config is embedded in `index.html`. To set up your own Firebase project:

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → Sign-in method → **Google**
3. Enable **Firestore Database** (start in production mode)
4. Add your domain to **Authentication** → Settings → Authorized domains
5. Set Firestore security rules:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
6. Replace the `FIREBASE_CONFIG` object in `index.html` with your project's config

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Complete app (React + all code) |
| `manifest.json` | PWA metadata |
| `icon192.png` | App icon 192×192 |
| `icon512.png` | App icon 512×512 |
| `DEPLOY_README.md` | Deployment instructions |
| `BOOKSHELF_PROJECT_DOCS.md` | Full technical documentation |

---

## Installing to iPhone Home Screen

1. Open the live URL in **Safari** (must be Safari)
2. Tap the Share button → **Add to Home Screen**
3. The app opens fullscreen with no browser chrome

---

## License

Personal project — not currently open for public distribution.
