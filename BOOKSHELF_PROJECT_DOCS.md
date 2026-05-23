# 📚 Bookshelf App — Project Documentation

**Last Updated:** May 23, 2026
**Current File:** `index.html` (self-contained PWA — React via CDN, no build step)
**Project Type:** Mobile-first book tracker, deployed as a PWA installable on iPhone
**Ultimate Goal:** Native iOS app via Capacitor
**Service Worker:** bookshelf-v14

-----

## 1. Project Overview

A personal book library tracker for iOS. Catalog every book you own, add them via barcode scan, cover photo AI recognition, or manual search. Track reading progress, personal notes, highlights, loans, and format (physical/ebook/audiobook). Includes gamification (XP, levels, 39 achievements), AI-powered suggestions, stats, saved filter views, and backup/restore.

The prototype runs as a PWA in Safari. Deploy to Netlify or GitHub Pages, install to home screen — it feels like a native app.

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
|State|React `useState` + `localStorage`|Full persistence — books, shelves, goal, achievements, saved views, backup timestamp|
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

### localStorage Keys

| Key | Contents |
|-----|----------|
| `bs_books` | Full book array |
| `bs_goal` | Reading goal number |
| `bs_shelves` | Custom shelf names array |
| `bs_theme` | `"dark"` or `"light"` |
| `bs_achievements` | Array of earned achievement IDs |
| `bs_savedViews` | Array of saved filter view objects |
| `bs_lastBackup` | Timestamp of last JSON backup export |
| `bs_onboarded` | Boolean — onboarding shown |

-----

## 8. Session History

### Sessions 1–11 — Initial Build through Gamification + Dark Mode

See earlier doc versions. Key features built: barcode/cover/search add, detail modal, reading progress, highlights, loan tracker, custom shelves, series modal, stats screen, mood suggestions, achievements (24), XP system, light/dark theme, Goodreads CSV import, Saved Views, backup/restore, offline banner, onboarding.

### Session 12 — Today's Work (May 23, 2026)

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
|Cross-device sync|Future|localStorage only — clears if Safari data cleared; backup/restore is the mitigation|

-----

## 10. Remaining Backlog

### Ready to Build (Next Session)

- [ ] **Capacitor iOS wrap** — `npx cap init`, `npx cap add ios`, `npx cap sync`, open in Xcode
- [ ] **CloudKit sync** (after Capacitor) — replace localStorage with CloudKit private database via Swift bridge
- [ ] **Native barcode scanner** — swap ZXing for `@capacitor-mlkit/barcode-scanning` (faster, torch support)

### Needs Backend / Native

- [ ] **Haptic feedback** — `@capacitor/haptics` after Capacitor setup
- [ ] **Push notifications** — reading reminders via `@capacitor/push-notifications`
- [ ] **iOS Home Screen Widget** — WidgetKit, Swift only
- [ ] **Book clubs / shared lists** — requires user accounts + backend
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
|`BOOKSHELF_PROJECT_DOCS.md`|This file|
|`DEPLOY_README.md`|Step-by-step Netlify + iPhone deploy instructions|

-----

## 12. How to Resume in a New Session

> "I'm continuing work on my Bookshelf iOS book tracker PWA. Please read the project documentation file, then I'll share the current `index.html` source so we can continue."

Share `BOOKSHELF_PROJECT_DOCS.md` first, then `index.html`.

The app currently runs at SW v14. All features are in the single `index.html` — no build step required.
