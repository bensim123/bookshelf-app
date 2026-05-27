# 📚 Bookshelf App — Project Documentation

**Last Updated:** May 25, 2026
**Current Version:** v30 (SW `bookshelf-v30`)
**Current File:** `index.html` (self-contained PWA — React via CDN, no build step)
**Project Type:** Mobile-first book tracker — deployed as a web app with cloud sync
**Live URL:** https://bensim123.github.io/bookshelf-app

-----

## 1. Project Overview

A personal book library tracker that runs as a web app with cloud sync. Catalog every book you own, add them via barcode scan or manual search. Track reading progress, personal notes, highlights, loans, and format (physical/ebook/audiobook). Includes gamification (XP, levels, 60 achievements, monthly challenges), AI-powered suggestions, stats, saved filter views, friends, and import/export.

Hosted on GitHub Pages. Sign in with Google — your library is private and syncs across all your devices via Firebase Firestore. Install to iPhone home screen from Safari for a native app feel.

-----

## 2. Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | React 18 (UMD via unpkg CDN) | Runs without a build step |
| Transpiler | Babel standalone (unpkg CDN) | JSX compiled in-browser; must avoid `\`` inside `${}` (newer Babel rejects it) |
| Fonts | Playfair Display + Nunito (Google Fonts) | Preloaded in `<head>` |
| Book Data API | Open Library (free, no key) | Search, ISBN lookup, editions, covers |
| Cover Images | Open Library Covers API | `covers.openlibrary.org/b/isbn/{ISBN}-L.jpg` |
| Barcode Scanning | ZXing (`@zxing/browser@0.1.5` via jsDelivr) | Dynamically imported, rear camera |
| AI (Series + Suggestions) | Groq `llama-3.3-70b-versatile` via Cloudflare Worker proxy | Series detection, personalized picks, mood suggestions |
| Auth | Firebase Authentication | Google Sign-In; `onAuthStateChanged` drives Root state machine |
| Storage | Firebase Firestore | Per-user document `users/{uid}`; debounced writes (600ms for books, immediate for other keys) |
| Theme | `localStorage` (`bs_theme`) | Kept local for instant pre-auth application; not synced to Firestore |
| PWA | Inline service worker (blob URL) | Caches React + Babel; version-bumped on each deploy |
| Hosting | GitHub Pages | Branch: `feature/firebase-auth-and-cloud-sync` |

-----

## 3. Design System

### Themes

Two complete palettes — Dark (default) and Light. Toggled with ☀️/🌙 button. Persisted in `localStorage`. Anti-flash script in `<head>` pre-applies theme before React renders.

**Dark palette:**
```
bg: #0f0f14    bgCard: #1e1e2e    bgSurface: #252535
accent: #6366f1    accentDk: #4f46e5    accentLt: #818cf8    accentGlow: rgba(99,102,241,.25)
gold: #f59e0b    green: #10b981    red: #ef4444    purple: #a855f7
text: #f1f1f8    textLt: #c8c8e0    muted: #6b6b8a
navBg: rgba(15,15,20,0.92)
border: rgba(255,255,255,0.07)    borderAccent: rgba(99,102,241,0.3)
ringTrack: rgba(255,255,255,0.08)
emptyStars: #4a4a6a    disabledBtn: #3a3a5a
```

**Light palette:**
```
bg: #f5f5ff    bgCard: #ffffff    bgSurface: #ebebf5
accent: #4f46e5    accentDk: #3730a3    accentLt: #6366f1    accentGlow: rgba(79,70,229,.15)
gold: #d97706    green: #059669    red: #dc2626    purple: #7c3aed
text: #1a1a2e    textLt: #4a4a6a    muted: #8585a8
navBg: rgba(245,245,255,0.92)
border: rgba(0,0,0,0.07)    borderAccent: rgba(79,70,229,0.3)
ringTrack: rgba(0,0,0,0.08)
emptyStars: #c8c8e0    disabledBtn: #b0b0c8
```

**Status colors (both themes):**
```
owned: #6366f1    reading: #10b981    read: #3b82f6
dnf: #ef4444    wishlist: #a855f7
```

### Typography
- **Display/Headings:** Playfair Display (serif) — 400, 700, 900
- **UI/Body:** Nunito (sans-serif) — 400, 600, 700, 800

### Format Icons
- Physical: 📖 | E-Book: 📱 | Audiobook: 🎧

-----

## 4. Data Model

### Book object
```js
{
  id: string,               // OL work key (e.g. "OL123W") or random UUID
  title: string,
  subtitle: string,
  authors: string[],
  cover: string|null,       // Open Library cover URL (may be user-uploaded data URL)
  coverCandidates: string[],// All valid cover URLs found (for cover picker)
  genre: string,            // User-editable (from GENRES list)
  categories: string[],     // Raw from OL subjects (up to 4)
  year: string,
  publishedDate: string,
  publisher: string,
  pages: string,            // For audiobooks: total minutes as string
  description: string,      // May contain HTML — strip before display
  language: string,         // ISO 639-1: "en", "fr", "de", etc.
  isbn13: string,
  isbn10: string,
  averageRating: number,
  ratingsCount: number,
  previewLink: string,
  price: string|null,       // Avg US paperback price from AI ("$14.99")

  // Format
  bookFormat: "physical"|"ebook"|"audiobook",             // default: "physical"
  bookBinding: "paperback"|"hardcover"|"mass_market"|"unknown",  // physical only

  // User fields
  status: "owned"|"reading"|"read"|"dnf"|"wishlist",
  rating: number,           // 0–5, personal star rating
  notes: string,
  addedAt: number,          // Date.now() timestamp
  customShelves: string[],  // names of custom shelves book belongs to

  // Progress (physical/ebook: page number; audiobook: minutes listened)
  currentPage: number,
  progressHistory: [{date: string, page: number, pct: number}],

  // Features
  readDates: string[],      // ISO dates when status changed to "read"
  highlights: [{id, text, page, date}],
  loan: {name: string, date: string}|null,
}
```

### Firestore document (`users/{uid}`)

| Field | Type | Contents |
|-------|------|----------|
| `books` | array | Full book array |
| `goal` | number | Yearly reading goal |
| `shelves` | array | Custom shelf name strings |
| `achievements` | array | Earned achievement ID strings |
| `completedChallenges` | array | Completed monthly challenge `ym` strings (e.g. `"2026-05"`) |
| `savedViews` | array | Saved filter view objects |
| `lastBackup` | number | Timestamp of last JSON backup export |
| `onboarded` | boolean | Whether onboarding sheet has been shown |
| `friends` | array | Friend UID strings |

**localStorage** (device-only):

| Key | Contents |
|-----|----------|
| `bs_theme` | `"dark"` or `"light"` — applied before auth to prevent flash |

-----

## 5. Component Architecture

```
Root
├── LoadingScreen (while Firebase resolves auth)
├── AuthScreen (unauthenticated — Google Sign-In)
└── App (authenticated)
    ├── OfflineBanner (fixed top, shows when navigator.onLine = false)
    ├── Library Tab
    │   ├── Header (title, theme toggle, shelves, profile/avatar)
    │   ├── XPBar compact (level badge + progress bar)
    │   ├── GoalRing + Stats mini-grid (Total/Read/Reading/Wishlist)
    │   ├── MonthlyChallenge card (current challenge + progress bar)
    │   ├── Currently Reading/Listening cards
    │   ├── Loaned Books banner
    │   ├── Search input
    │   ├── FilterBar (status pills, genre, shelf, sort, saved views)
    │   ├── Book count + view toggle (⊞ / ☰) + wishlist export
    │   └── BookCard grid OR ListView
    ├── Stats Tab (StatsScreen)
    ├── Achievements Tab (AchievementsScreen — XPBar, badge grid, filter tabs)
    ├── Suggestions Tab (SuggestScreen — Personalized / By Mood)
    └── FAB (＋ add book, library tab only)

Modals / Sheets:
├── AddModal → BarcodeScanner | ShopCheckModal | SearchPanel
├── DetailModal (status, format, binding, progress, rating, notes, series, highlights, loan, buy buttons)
├── ReadingProgressModal
├── HighlightsModal
├── LoanModal
├── CoverPickerModal
├── WishlistExportModal (email / text / print)
├── GoalSetupModal
├── ShelvesModal + SmartShelvesModal
├── SeriesModal (companion book checklist)
├── ImportExportModal (CSV export, Bookshelf/Goodreads/StoryGraph import)
├── FriendsModal + FriendProfileSheet
├── SavedViewsModal
├── OnboardingSheet (first launch, 4 steps)
└── AboutModal (help sections + version)
```

-----

## 6. API Integration

### Open Library

**Search:** `https://openlibrary.org/search.json?q={q}&limit={n}&fields={...}&language={olCode}`
- Language param maps ISO → OL codes via `OL_LANG` table (22 languages)
- Secondary language filter applied client-side

**ISBN Edition lookup:** `https://openlibrary.org/isbn/{isbn}.json` → fetches work + author in sequence. Captures `physical_format` for binding detection.

**Covers:** `https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg` or `/b/id/{cover_i}-L.jpg`

### AI (Groq via Cloudflare Worker proxy)

- **Series Detection:** `fetchSeriesTitles(book, existingBooks)` — finds series companions via OL search; filters by author, language, series token overlap. Shows "🔍 Checking for series companions…" toast on trigger.
- **Personalized Suggestions:** 25 book recommendations based on owned/read library. Client-side dedup filters out any books already in library by title.
- **Mood Suggestions:** 8 books matching a described mood. Same dedup logic.
- Model: `llama-3.3-70b-versatile`

### ZXing Barcode Scanner

- Dynamic import from jsDelivr CDN at scan time
- Rear camera, decodes ISBN-10/13 barcodes

-----

## 7. Key Logic

### Gamification

**XP per book read:**
- Physical: 50 XP | E-Book: 55 XP | Audiobook: 60 XP

**Bonus XP:**
- Rating: +10 per rated book
- Notes: +5 per book with notes
- Highlights: +8 per highlight
- Multi-format (same title): 2 formats = +15 XP, 3 formats = +30 XP (excludes wishlist)
- Achievement earned: +achievement.xp
- Monthly challenge completed: +challenge.xp

**`calcXP(books, goal, earned=[], completedChallenges=[])`**
Aggregates all XP sources. Used by `XPBar` and `AchievementsScreen`.

**Levels:** 12 named tiers (`LEVEL_TITLES`) from "Curious Mind" (level 1) to "Legendary Bibliophile" (level 12+).

### Achievements (60 total)

6 categories:
| Category | Count | Examples |
|----------|-------|---------|
| Reading | 10 | First Book, Century, Binge Month (5 in one month) |
| Library | 9 | Library 10/50, Wish Big (20 wishlist), Grand Library (100 books), Series Collected |
| Depth | 10 | Critic, Hall of Fame (5-star × 5), Deep Diver (25 highlights) |
| Explore | 11 | Genre Hopper, Space Cadet, Fantasy Fan, Amateur Detective, Truth Seeker, History Buff |
| Goals | 3 | Goal Setter, Halfway, Goal Done |
| Format | 14 | Audiobook milestones, ebook milestones, cross-format combos |

**`checkNewAchievements(books, goal, earned)`** — called on every books/goal change; returns newly unlocked achievements.

**`ACHIEVEMENT_PROGRESS`** map — per-achievement `(books) => {n, max}` for progress bars.

**`useMemo`** in `AchievementsScreen` — all progress values computed once per render cycle.

### Monthly Challenges

**`MONTHLY_CHALLENGES`** — array of 60 entries covering May 2026 – April 2031.

Each entry:
```js
{
  ym: "2026-05",       // year-month key
  icon: "🌸",
  title: "Spring Awakening",
  xp: 150,
  desc: "Read any 1 book this month",
  check: (books, y, m) => boolean,   // completion check
  prog:  (books, y, m) => {n, max},  // progress for bar
}
```

Challenge types used: read N books, read a specific genre, read an audiobook/ebook, read a long/short book, add N books to library.

**Helpers:**
- `booksReadInMonth(books, y, m)` — uses `readDates` array first, falls back to `addedAt`
- `booksAddedInMonth(books, y, m)` — uses `addedAt`

**App integration:**
- `completedChallenges` state initialized from `load("completedChallenges", [])`
- `useEffect([books])` checks current month's challenge on every books change; calls `showToast("🎯 Monthly Challenge complete! +N XP")` and saves
- `MonthlyChallenge` component: shown on home screen; renders current card + past-3 chips + next-month preview

### Smart Shelves

Dynamic shelves stored in `savedViews` (Firestore). Each view has criteria (title/author/genre/year/pages/rating/status with `eq|gte|lte` operators). `SmartShelvesModal` provides builder UI. Applied like saved filter views.

### Series Detection

`extractSeries(book)` — regex extracts series name from parenthetical `(Series, #N)` or subtitle.

`fetchSeriesTitles(book, existingBooks)` — OL search in book's language; filters by author last name, language, series token overlap. Excludes the source book + all existing library books (any status).

### Deduplication

`addBook()` allows same title in multiple formats (own paperback + audiobook). Deduplication within same format: exact id match → ISBN match → title+format match.

### Format-Aware Progress

- Physical/Ebook: `currentPage` = page number, `pages` = total pages
- Audiobook: `currentPage` = minutes listened, `pages` = total minutes
- `fmtMinutes(mins)` formats as "4h 30m"

### Buy Links

`pLinks(book)` generates Amazon, Barnes & Noble, and Half Price Books search URLs. `BuyButtons` component renders all three with flex-wrap so they fit on small screens. Amazon uses dark bg (`#131921`) with orange text (`#ff9900`).

### Friends

Friends stored as UID arrays. `FriendsModal` handles add-by-email (looks up `emailToUid/{encoded}` in Firestore), view friend list, accept/decline requests. `FriendProfileSheet` shows a friend's stats, recently read, and achievement comparison side-by-side.

-----

## 8. Babel CDN Note

The app uses `https://unpkg.com/@babel/standalone/babel.min.js` **without a version pin**. A Babel CDN update in late 2026 broke the app by rejecting escaped backticks (`\``) inside `${}` expressions (it was treating them as unicode escape sequences). Fixed in v30 by removing the unnecessary backslashes — inner template literals inside `${}` don't need backtick escaping.

**Rule going forward:** Never use `\`` inside template literals. Inside a `${...}` expression, start inner template literals with an unescaped `` ` ``.

-----

## 9. Session History Summary

| Version | SW | Key Changes |
|---------|-----|-------------|
| v1–v14 | v1–v14 | Initial build: barcode scan, detail modal, progress, highlights, loans, shelves, series, stats, achievements (24), XP, light/dark theme, Goodreads CSV, saved views, backup, offline banner, onboarding, cover picker, language search, binding detection, 14 format achievements |
| v22 | v22 | Multi-format dedup, 6 new achievements, Find Series, ISBN UX |
| v23 | v23 | Shopping check mode, About modal, B&N silent ISBN fallback |
| v24 | v24 | Achievement XP fix, progress bars, filter tabs |
| v25 | v25 | Unified Import/Export modal (replaces backup modal) |
| v26 | v26 | Smart Shelves, achievement comparison, HTML share links |
| v27 | v27 | Store buttons (Amazon dark bg), 12 new achievements (genre mastery, hall of fame, etc.), series toast notification, AI suggestion dedup, useMemo for achievement progress |
| v28 | v28 | *Broken* — monthly challenges implementation had Babel syntax error |
| v29 | v29 | Monthly challenges (60-month calendar May 2026–Apr 2031), reverted v28 and re-implemented cleanly |
| v30 | v30 | Fix Babel parse error: removed `\`` inside `${}` expressions in WishlistExport and SuggestScreen |
| v31 | v31 | Full documentation update: README, HELP_SECTIONS, BOOKSHELF_PROJECT_DOCS rewritten to v30/v31 state |
| v32 | v32 | **App version 3.2** — wishlist button in search results, auto-save in DetailModal, BookCard context menu (right-click/long-press), fix Friends page (reads `profiles/` not `users/`), public stats sync to `profiles/{uid}`, friend request toast, safe-area fix for detail view header icons, semantic versioning (git vN → "N/10" display) |
| v33 | v33 | **App version 3.3** — fix B&N and HPB store search URLs (B&N: `/s/` prefix, HPB: `hpb.com/search?q=`), prefer ISBN over title for all store links; replace 3 side-by-side buy buttons with single "Where to Buy" dropdown button |

-----

## 10. Versioning Scheme

App version numbers display in the UI (Settings, About screen). Starting with v32:

| Git tag | App displays | When to bump |
|---------|-------------|--------------|
| vX where X % 10 == 0 | X.0 | Major platform change (new auth, backend rewrite, full UI overhaul) |
| vX (feature session) | X/10 rounded to 1 decimal | New user-facing feature set per session = minor bump |
| vX (bug fix only) | previous + .Z patch | Bug fixes, docs only = patch bump (e.g. "3.2.1") |

Current: **v32 = app version 3.2**. Format going forward: `const APP_VERSION="3.2"` in `index.html`.

-----

## 11. Known Issues & Limitations

| Issue | Status | Notes |
|-------|--------|-------|
| Babel CDN unversioned | Risk | If Babel CDN updates again, re-check for new syntax restrictions |
| Barcode scanner | Requires real device | Camera access blocked on desktop emulators |
| OL cover placeholder images | Minor | OL returns 1×1px for missing covers — cover picker's `useCoverValid` filters these |
| Audiobook total time | UX | User must manually enter total minutes — not auto-fetched |
| Series detection accuracy | Minor | Works well for `(Series, #N)` titles; less reliable for unnumbered series |
| Firestore 1MB limit | Scalability risk | All books in one `users/{uid}` document; ~500–1,000 books before hitting limit. Subcollection migration (`users/{uid}/books/{bookId}`) would fix this for heavy users. |

-----

## 12. Remaining Backlog

### High Priority
- [ ] **Pin Babel CDN version** — lock to a known-good version to prevent future CDN updates breaking the app
- [ ] **Firestore subcollection migration** — migrate `books` array from `users/{uid}` to `users/{uid}/books/{bookId}` for scalability
- [ ] **Audiobook total time auto-fetch** — estimate from AI or Audible metadata

### Nice to Have
- [ ] **Bulk edit** — select multiple books, change status/shelf/format in one action
- [ ] **Push notifications** — reading reminders + friend request alerts (web push via Firebase Cloud Messaging)
- [ ] **Duplicate detection improvement** — fuzzy title matching for slight variations

### Future / Native Path
- [ ] **Capacitor iOS wrap** — `npx cap init`, `npx cap add ios`, see `Bookshelf_iOS_Distribution_Guide.md`
- [ ] **Native barcode scanner** — swap ZXing for `@capacitor-mlkit/barcode-scanning`
- [ ] **Haptic feedback** — `@capacitor/haptics`
- [ ] **iOS Home Screen Widget** — WidgetKit, Swift only

-----

## 12. File Reference

| File | Description |
|----|-----------|
| `index.html` | Complete self-contained app (React via CDN, inline SW, all code) |
| `manifest.json` | PWA metadata (name, icons, display mode, theme colors) |
| `icon192.png` | App icon 192×192 |
| `icon512.png` | App icon 512×512 |
| `README.md` | GitHub repo README — features, tech stack, setup |
| `BOOKSHELF_PROJECT_DOCS.md` | This file — full technical documentation |
| `DEPLOY_README.md` | Step-by-step GitHub Pages + iPhone deploy instructions |
| `Bookshelf_iOS_Distribution_Guide.md` | Guide for future Capacitor/TestFlight iOS packaging |

-----

## 13. How to Resume in a New Session

> "I'm continuing work on my Bookshelf web app. Please read `BOOKSHELF_PROJECT_DOCS.md` first so you have full context, then read `index.html` so we can continue."

Key facts for a new session:
- All features are in the single `index.html` — no build step
- Current version: v33 (app version 3.3), SW `bookshelf-v33`
- React hooks must be destructured: `const { useState, useEffect, useMemo, useCallback, useRef } = React;`
- Firebase compat SDK (not modular) — use `firebase.auth()`, `firebase.firestore()` etc.
- `_userCache` / `_userDocRef` are module-level vars set by `Root` on sign-in
- `save(key, value)` / `load(key, default)` wrappers handle Firestore + cache sync
- Babel CDN: never use `\`` inside `${}` expressions (causes parse error in newer Babel)
- Live URL: https://bensim123.github.io/bookshelf-app (branch: `feature/firebase-auth-and-cloud-sync`)
