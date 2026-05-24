# 📚 Bookshelf App — Project Documentation

**Last Updated:** May 23, 2026
**Current File:** `index.html` (self-contained PWA — React via CDN, no build step)
**Project Type:** Mobile-first book tracker — deployed as a web app with cloud sync
**Ultimate Goal:** Best-in-class personal reading tracker, web-first with optional native iOS packaging later
**Service Worker:** bookshelf-v14
**Live URL:** https://bensim123.github.io/bookshelf-app

-----

## 1. Project Overview

A personal book library tracker that runs as a web app with cloud sync. Catalog every book you own, add them via barcode scan, cover photo AI recognition, or manual search. Track reading progress, personal notes, highlights, loans, and format (physical/ebook/audiobook). Includes gamification (XP, levels, 39 achievements), AI-powered suggestions, stats, saved filter views, and backup/restore.

Hosted on GitHub Pages. Sign in with Google — your library is private and syncs across all your devices via Firebase Firestore. Install to iPhone home screen from Safari for a native app feel.

-----

## 2. Tech Stack

|Layer|Choice|Notes|
|-----|------|-----|
|Framework|React 18 (UMD via unpkg CDN)|Runs without a build step|
|Transpiler|Babel standalone|JSX compiled in-browser|
|Fonts|Playfair Display + Nunito (Google Fonts)|Preloaded in `<head>`|
|Book Data API|Open Library (free, no key)|Search, ISBN lookup, editions, covers|
|Cover Images|Open Library Covers API|`covers.openlibrary.org/b/isbn/{ISBN}-L.jpg`|
|Barcode Scanning|ZXing (`@zxing/browser@0.1.5` via jsDelivr)|Dynamically imported, rear camera|
|Cover AI Recognition|Claude API (`claude-sonnet-4-20250514`)|Photo → JSON {title, author, isbn, language}|
|AI Suggestions|Claude API (`claude-sonnet-4-20250514`)|25 personalized or 8 mood-based suggestions|
|Auth|Firebase Authentication|Google Sign-In; `onAuthStateChanged` drives Root component state machine|
|Storage|Firebase Firestore|Per-user document `users/{uid}`; debounced writes (600ms for books, immediate for other keys)|
|Theme|`localStorage` (`bs_theme`)|Kept local for instant pre-auth application; not synced to Firestore|
|PWA|Inline service worker (blob URL)|Caches React + Babel; version-bumped on each deploy|

-----

## 3. Design System

### Themes

Two complete palettes — Dark (default) and Light. Toggled with ☀️/🌙 button. Persisted in `localStorage`. Anti-flash script in `<head>` pre-applies theme before React renders.

**Dark palette:**
```
bg: #0f0f14    bgCard: #1e1e2e    bgSurface: #252535
accent: #6366f1    gold: #f59e0b    green: #10b981
text: #f1f1f8    muted: #6b6b8a
navBg: rgba(15,15,20,0.92)
ringTrack: rgba(255,255,255,0.08)
emptyStars: #4a4a6a    disabledBtn: #3a3a5a
```

**Light palette:**
```
bg: #f5f5ff    bgCard: #ffffff    bgSurface: #ebebf5
accent: #4f46e5    gold: #d97706    green: #059669
text: #1a1a2e    muted: #8585a8
navBg: rgba(245,245,255,0.92)
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

Each book in the library:

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

  // Format
  bookFormat: "physical"|"ebook"|"audiobook",  // default: "physical"
  bookBinding: "paperback"|"hardcover"|"mass_market"|"unknown",  // physical only

  // User fields
  status: "owned"|"reading"|"read"|"dnf"|"wishlist",
  rating: number,           // 0–5, personal star rating
  notes: string,
  addedAt: number,          // Date.now() timestamp

  // Progress (physical/ebook: page number; audiobook: minutes listened)
  currentPage: number,
  progressHistory: [{date: string, page: number, pct: number}],

  // Features
  readDates: string[],      // ISO dates when status changed to "read"
  highlights: [{id, text, page, date}],
  customShelves: string[],  // names of custom shelves book belongs to
  loan: {name: string, date: string}|null,
}
```

-----

## 5. Component Architecture

```
App
├── OfflineBanner (fixed top, shows when navigator.onLine = false)
├── Library Tab
│   ├── Header row (title, ☀️/🌙, 📂 Shelves, 💾 Backup)
│   ├── XPBar (compact — level badge + progress bar)
│   ├── GoalRing + Stats mini-grid (Total/Read/Reading/Wishlist)
│   ├── Currently Reading/Listening cards (tappable → DetailModal)
│   ├── Loaned Books banner
│   ├── Search input (with × clear)
│   ├── FilterBar
│   │   ├── SavedViewsBar (pill strip of saved views)
│   │   ├── "⚙ Filter & Sort" button (with active count badge)
│   │   ├── Active filter chips (dismissible)
│   │   └── Dropdown panel (Status pills, Genre select, Shelf select, Sort pills, Save View)
│   ├── Book count + view toggle (⊞ grid / ☰ list) + wishlist export
│   ├── BookCard grid OR ListView
│   └── FAB (＋ add book, library tab only)
├── Stats Tab (StatsScreen)
├── Achievements Tab (AchievementsScreen)
└── Suggestions Tab (SuggestScreen)

Sheets (bottom-sheet modals):
├── AddModal → BarcodeScanner | CoverScanner | SearchPanel (with CoverPickerModal)
├── DetailModal (hero cover, share ⬆️, 🖼 Cover button, status/format/binding, date finished, rating, progress, meta, notes)
│   └── CoverPickerModal (cover candidates grid + upload)
├── ReadingProgressModal (page/% or minutes for audiobooks)
├── HighlightsModal
├── LoanModal
├── WishlistExport (email/text/PDF)
├── GoalSetup
├── ShelvesModal
├── SeriesModal (checklist of series companions)
├── CSVImportModal (Goodreads/StoryGraph)
├── BackupModal (export JSON / restore JSON)
├── OnboardingSheet (4-step first launch, saved to localStorage)
└── SavedViewsModal (save/delete named filter views)
```

-----

## 6. API Integration

### Open Library

**Search:** `https://openlibrary.org/search.json?q={q}&limit={n}&fields={...}&language={olCode}`
- Fields requested: `key,title,subtitle,author_name,isbn,cover_i,first_publish_year,publisher,number_of_pages_median,subject,language,description,edition_count`
- Language param uses OL codes (e.g. `eng`, `fre`, `ger`) mapped from ISO via `OL_LANG` table
- Secondary language filter applied client-side (OL sometimes ignores the param)
- `null` lang → defaults to `eng`

**ISBN Edition lookup:** `https://openlibrary.org/isbn/{isbn}.json` → fetches work + author in sequence (3 requests total). Captures `physical_format` for binding detection.

**Editions for binding:** `https://openlibrary.org/works/{id}/editions.json?limit=20` — used by `fetchEditionForBinding()` when adding series books to find matching paperback/hardcover.

**Covers:** `https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg` or `/b/id/{cover_i}-L.jpg`

### Claude API

- **Cover Recognition:** Sends base64 image, returns `{title, author, isbn, language}` JSON. Language used for subsequent OL search.
- **AI Suggestions:** 25 personalized or 8 mood-based. Both call `claude-sonnet-4-20250514` at `max_tokens: 5000/2000`.
- **No API key in code** — injected by Claude.ai environment.

### ZXing Barcode Scanner

- Dynamic import from jsDelivr CDN at scan time
- Rear camera, decodes ISBN-10/13 barcodes
- Camera stream cleaned up in `useEffect` return

-----

## 7. Key Logic

### Language-Aware Search

`olSearch(q, lim, lang)` — `lang` is ISO code. Mapped to OL code via `OL_LANG`. Both API-level and client-side filtering. Series search uses the scanned book's `language` field. Cover scanner AI now returns language and passes it to OL search.

### Binding Detection

`detectBinding(physicalFormat)` — maps OL strings ("Trade Paperback", "Hardback", etc.) to `paperback|hardcover|mass_market|unknown`. Called in `fetchByISBN`. Series books upgraded via `fetchEditionForBinding` which checks all 20 recent editions for a matching binding before falling back.

### Series Detection

`extractSeries(book)` — regex extracts series name from parenthetical `(Series, #N)` patterns or subtitle.

`fetchSeriesTitles(book, existingBooks)` — searches OL in book's language, filters by: author last name match, language match, series/token overlap with original title. Excludes: the scanned book itself (by id AND title), all existing library books (any status including wishlist). Parallel `fetchEditionForBinding` calls upgrade each result to the preferred binding.

### Format-Aware Progress

- **Physical/Ebook:** `currentPage` = page number, `pages` = total pages
- **Audiobook:** `currentPage` = minutes listened, `pages` = total minutes
- `fmtMinutes(mins)` formats as "4h 30m" or "45m"
- Lend button hidden for ebook/audiobook (can't lend digital)
- Stats: pages read excludes audiobooks; `totalAudioMins` tracked separately

### Deduplication

`addBook()` allows same title in different formats (so you can own paperback + audiobook). Deduplicates within same format by: exact id match, ISBN match (non-empty), or title+format match.

### Gamification

**XP:** Physical reads = 50 XP, ebooks = 55, audiobooks = 60. Ratings +10, notes +5, highlights +8 each. Format combo bonus: same title in 2 formats +15 XP, 3 formats +30 XP (excludes wishlist).

**Levels:** 12 named levels from "Curious Mind" to "Legendary Bibliophile".

**39 Achievements** across 6 categories: Reading, Library, Depth, Explore, Goals, Format. Format category (14 badges) covers audiobook milestones, ebook milestones, cross-format combos, and physical binding collection. All helper functions (`readBy`, `ownBy`, `ownByBinding`, `totalAudioMinutes`, `hasDualFormat`, `hasTripleFormat`) operate on non-wishlist books.

### Firestore Document Structure

Each user has a single document at `users/{uid}` with these fields:

| Field | Contents |
|-------|----------|
| `books` | Full book array |
| `goal` | Reading goal number |
| `shelves` | Custom shelf names array |
| `achievements` | Array of earned achievement IDs |
| `savedViews` | Array of saved filter view objects |
| `lastBackup` | Timestamp of last JSON backup export |
| `onboarded` | Boolean — onboarding shown |

**localStorage** (device-only, not synced):

| Key | Contents |
|-----|----------|
| `bs_theme` | `"dark"` or `"light"` — applied before auth to prevent flash |

**Module-level cache:** `_userCache` is populated from Firestore on sign-in and updated synchronously on every `save()` call. `load()` reads from cache after auth so all code that calls `load()` works synchronously.

-----

## 8. Session History

### Sessions 1–11 — Initial Build through Gamification + Dark Mode

See earlier doc versions. Key features built: barcode/cover/search add, detail modal, reading progress, highlights, loan tracker, custom shelves, series modal, stats screen, mood suggestions, achievements (24), XP system, light/dark theme, Goodreads CSV import, Saved Views, backup/restore, offline banner, onboarding.

### Session 13 — Today's Work (May 23, 2026)

**Cloud Sync + Auth (Firebase)**
- Replaced localStorage persistence with Firebase Firestore + Google Sign-In
- Chose Firebase over Supabase: Supabase pauses free-tier projects after 7 days of inactivity; Firebase free tier has no such limitation
- `Root` component: auth state machine (`loading → unauthenticated → authenticated`) wraps the whole app
- `AuthScreen`: Google Sign-In button shown when unauthenticated
- `LoadingScreen`: shown while Firebase resolves auth state on startup
- `_userDocRef` / `_userCache` module-level vars; `load()` reads from cache synchronously; `save()` writes to cache immediately and debounces Firestore write (600ms for books, immediate for other keys)
- `beforeunload` event flushes any pending Firestore writes
- Theme (`bs_theme`) kept in localStorage only — applied before auth resolves to prevent flash
- User avatar button in header → sign out
- New user documents seeded with default shape on first sign-in
- Firebase compat SDK (v10.12.0) loaded via CDN — works with non-module `<script>` tags

**Responsive Layout**
- `.app-inner` CSS class constrains content to 540px max-width on wide screens (desktop/tablet)
- `.sheet-inner` applies same constraint inside bottom-sheet modals
- Nav bar inner content also width-constrained via `.app-inner`

**Bug Fixes**
- Fixed pre-existing JSX parse error in `StatsScreen` recap card block — extra `</div>` was closing the root div 80 lines early, causing blank screen
- Fixed `useState is not defined` ReferenceError — React UMD exposes hooks as `React.useState` etc., not bare globals; added explicit destructuring at top of Babel script: `const { useState, useEffect, useMemo, useCallback, useRef } = React;`

**Infrastructure**
- Initialized git repo, created `bookshelf-app` GitHub repository
- PR #1: fixed icon filename mismatch in `manifest.json` and `DEPLOY_README.md`
- PR #2: Firebase auth + Firestore sync (this branch: `feature/firebase-auth-and-cloud-sync`)
- Hosted on GitHub Pages from `feature/firebase-auth-and-cloud-sync` branch
- Live URL: https://bensim123.github.io/bookshelf-app

---

### Session 12 — (May 23, 2026)

**Persistence Decision**
- Confirmed localStorage persistence was already working correctly
- Decided against Supabase — iCloud/CloudKit is the right solution for iOS
- Recommended path: Export/Import backup now → Capacitor → CloudKit later

**Backup & Restore (SW v8)**
- `BackupModal` — export full JSON backup, restore from file
- `BackupBtn` in header — red dot badge when >7 days since last backup
- Export includes: books, shelves, goal, achievements
- Restore fully replaces library with confirmation step

**Light/Dark Mode Fixes (SW v9)**
- Fixed 6 hardcoded dark-only colors: bottom nav, GoalRing SVG track, recap card pills, empty stars, disabled buttons, ListView sort arrows
- Added `navBg`, `ringTrack`, `recapPill`, `emptyStars`, `disabledBtn` to both palettes
- PWA `theme-color` meta tag now updates dynamically on toggle
- Fixed reading streak bug: was using `addedAt` instead of `readDates`

**UX Improvements (SW v10)**
- **Onboarding** — 4-step first-launch sheet (stored in `bs_onboarded`)
- **Offline indicator** — fixed red banner via `navigator.onLine` + event listeners
- **Currently Reading tap** — cards now open DetailModal; Update button stops propagation
- **Share book** — ⬆️ button in DetailModal hero, uses Web Share API
- **Read date picker** — date input in DetailModal when status = Read
- **FilterBar redesign** — replaces 4 separate rows with single "⚙ Filter & Sort" button + expandable panel + active filter chips
- **Saved Views** — save/apply/delete named filter+sort combinations; strip of pills above filter bar
- **Header cleanup** — Shelves button reduced to icon-only; header is less cluttered

**Cover Art & Language (SW v11)**
- `coverCandidates[]` field on every book — all valid cover URLs from ISBN variants + OL cover IDs
- `CoverPickerModal` — thumbnail grid of validated covers + upload own photo + "use no cover"
- Cover picker accessible: in SearchPanel (tap thumbnail) and DetailModal (🖼 Cover button)
- `useCoverValid` hook probes each URL before displaying
- `olSearch(q, lim, lang)` — language param maps ISO→OL codes, secondary client-side filter
- `OL_LANG` table for 22 languages
- Series search now in scanned book's language
- Cover scanner AI returns detected language, used for subsequent OL search
- Language badge shown on non-English search results

**Binding-Aware Series + Format Tracking (SW v12)**
- `detectBinding()` — maps OL physical_format strings to `paperback|hardcover|mass_market|unknown`
- `fetchEditionForBinding()` — fetches 20 editions of a work, finds matching binding, falls back to any
- Series results upgraded to matching binding via parallel edition fetches
- Wishlist books excluded from series suggestions
- `bookFormat` and `bookBinding` fields added to all books
- **Format picker** (Physical/E-Book/Audiobook) and **Binding picker** in DetailModal
- **Audiobook progress:** minutes-based tracking, `fmtMinutes()` formatter, uncapped input when total unknown
- Currently Reading shows format icon, audiobook time display
- DetailModal hides Lend button for ebook/audiobook
- Stats: Pages Read excludes audiobooks; new Hours Listened stat card
- Format icon badge on BookCards for non-physical books

**Format Gamification (SW v13)**
- 14 new format achievements (6 audiobook, 4 ebook, 4 cross-format)
- 2 new physical binding achievements (Paperback Paradise, Hardcover Devotee)
- `readBy`, `ownBy`, `ownByBinding`, `totalAudioMinutes`, `hasDualFormat`, `hasTripleFormat` helpers
- XP: audiobooks 60/book, ebooks 55/book, physical 50/book
- Format combo XP: +15 per title with 2 formats, +30 with all 3
- `cat` field on all achievements for category grouping
- 6-category AchievementsScreen: Reading, Library, Depth, Explore, Goals, Format

**Audit & Efficiency Pass (SW v14)**
- `loanedBooks`, `genres`, `stats` all memoized with `useMemo`
- Removed dead `allShelfNames` variable
- Removed redundant font injection `useEffect` (font already in `<head>`)
- Removed dead `isEbook` variable from `ReadingProgressModal`
- Fixed audiobook progress % capped at 100 when no total set
- Fixed audiobook number input clamps correctly based on maxVal
- `hasDualFormat`/`hasTripleFormat` now exclude wishlist/suggestion books
- `formatComboXP` in `calcXP` now excludes wishlist books
- Sample books updated with `bookFormat`/`bookBinding` fields and proper `readDates`

-----

## 9. Known Issues & Limitations

|Issue|Status|Notes|
|-----|------|-----|
|Blank screen in Claude.ai sandbox|Expected|Babel, CDNs, and localStorage blocked in iframe — works normally on Netlify/device|
|Barcode scanner|Requires real device|Camera access blocked on desktop emulators|
|OL cover placeholder images|Minor|OL returns 1×1px for missing covers — cover picker's `useCoverValid` filters these|
|audiobook total time|UX|User must manually enter total minutes — not auto-fetched from OL|
|Series detection accuracy|Minor|Works well for `(Series, #N)` titles; less reliable for unnumbered series|
|Cross-device sync|Resolved|Firebase Firestore — library syncs across all devices; sign in with Google|

-----

## 10. Remaining Backlog

### Ready to Build (Next Session)

- [ ] **Audiobook total time auto-fetch** — Audible/LibriVox API or AI estimation
- [ ] **Reading challenges** — custom goals beyond yearly count (e.g. "read 5 sci-fi this month")
- [ ] **Bulk edit** — select multiple books, change status/shelf/format in one action
- [ ] **Push notifications** — reading reminders (web push via Firebase Cloud Messaging)

### Future / Native Path

- [ ] **Capacitor iOS wrap** — `npx cap init`, `npx cap add ios`, see `Bookshelf_iOS_Distribution_Guide.md`
- [ ] **Native barcode scanner** — swap ZXing for `@capacitor-mlkit/barcode-scanning` (faster, torch support)
- [ ] **Haptic feedback** — `@capacitor/haptics` after Capacitor setup
- [ ] **iOS Home Screen Widget** — WidgetKit, Swift only
- [ ] **Live pricing** — ISBNdb ($9.99/mo) is most reliable; "Check Price" deep links already implemented

### Nice to Have

- [ ] **Audiobook total time auto-fetch** — Audible/LibriVox API or AI estimation
- [ ] **Reading challenges** — custom goals beyond yearly count (e.g. "read 5 sci-fi this month")
- [ ] **Bulk edit** — select multiple books, change status/shelf/format in one action
- [ ] **Duplicate detection improvement** — fuzzy title matching for slight variations

-----

## 11. File Reference

|File|Description|
|----|-----------|
|`index.html`|Complete self-contained app (React via CDN, inline SW, all code)|
|`manifest.json`|PWA metadata (name, icons, display mode, theme colors)|
|`icon192.png`|App icon 192×192|
|`icon512.png`|App icon 512×512|
|`README.md`|GitHub repo README — features, tech stack, setup|
|`BOOKSHELF_PROJECT_DOCS.md`|This file — full technical documentation|
|`DEPLOY_README.md`|Step-by-step GitHub Pages + iPhone deploy instructions|
|`Bookshelf_iOS_Distribution_Guide.md`|Guide for future Capacitor/TestFlight iOS packaging|

-----

## 12. How to Resume in a New Session

> "I'm continuing work on my Bookshelf web app. Please read `BOOKSHELF_PROJECT_DOCS.md` first so you have full context, then read `index.html` so we can continue."

The app is live at https://bensim123.github.io/bookshelf-app (GitHub Pages, `feature/firebase-auth-and-cloud-sync` branch).

Key facts for a new session:
- All features are in the single `index.html` — no build step
- SW v14; Firebase auth + Firestore sync added in Session 13
- React hooks must be destructured explicitly: `const { useState, useEffect, ... } = React;`
- Firebase compat SDK (not modular) — use `firebase.auth()`, `firebase.firestore()` etc.
- `_userCache` / `_userDocRef` are module-level vars set by `Root` component on sign-in
- PR #1 (icon fix) and PR #2 (Firebase) are open on GitHub — both unmerged as of Session 13
