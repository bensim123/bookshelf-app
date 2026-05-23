# 📚 Bookshelf PWA — Deployment Guide

## Files in this package

|File           |Purpose                                  |
|---------------|-----------------------------------------|
|`index.html`   |The complete app (React + all code)      |
|`sw.js`        |Service worker (offline support, caching)|
|`manifest.json`|PWA metadata (name, icons, display mode) |
|`icon192.png`  |App icon 192×192                         |
|`icon512.png`  |App icon 512×512                         |

All 5 files must be in the **same folder** on your web server.

-----

## Step 1: Get a free host

**Recommended: Netlify Drop** (fastest, no account needed)

1. Go to **netlify.com/drop**
1. Drag your entire folder onto the page
1. You get a live URL instantly (e.g. `https://bookshelf-abc123.netlify.app`)

**Alternative: GitHub Pages** (free, permanent)

1. Create a free account at github.com
1. New repository → name it `bookshelf`
1. Upload all 5 files
1. Settings → Pages → Branch: main → Save
1. Your URL: `https://yourusername.github.io/bookshelf`

-----

## Step 2: Open on your iPhone

1. On your iPhone, open **Safari** (must be Safari, not Chrome)
1. Go to your URL from Step 1
1. Wait for the page to fully load

-----

## Step 3: Install to Home Screen

1. Tap the **Share** button (the box with an arrow pointing up, bottom of Safari)
1. Scroll down and tap **“Add to Home Screen”**
1. Name it **Bookshelf** → tap **Add**
1. The app icon appears on your home screen 📚

-----

## What you get after installing

✅ Opens fullscreen — no Safari browser chrome  
✅ Works offline after first load  
✅ Your data is saved on the device (localStorage)  
✅ Each user’s library is separate (login required)  
✅ Camera access for barcode scanning works  
✅ Feels like a native app

-----

## Troubleshooting

**“Add to Home Screen” is greyed out**  
→ You must use Safari. Chrome and other browsers don’t support this on iOS.

**App doesn’t load offline**  
→ Visit the page once on WiFi first to let the service worker cache everything.

**Camera doesn’t work**  
→ iOS will ask for camera permission the first time you tap Scan. Tap Allow.

**Data disappeared**  
→ Data is stored in Safari’s localStorage. Clearing Safari data will erase it. For permanent storage, consider upgrading to a backend (Phase 2).

-----

## Updating the app in the future

When we make changes to the code, just re-upload `index.html` and `sw.js` to Netlify (drag and drop again). The service worker version bump will refresh the cache automatically.

-----

## Phase 2 options (when you’re ready)

- **Capacitor**: wrap this same code as a real native iOS app for the App Store
- **Backend + database**: replace localStorage with a real database so data syncs across all your devices and isn’t tied to one browser