# 📚 Bookshelf — Deployment Guide

## Files in this package

| File | Purpose |
|------|---------|
| `index.html` | The complete app (React + all code) |
| `manifest.json` | PWA metadata (name, icons, display mode) |
| `icon192.png` | App icon 192×192 |
| `icon512.png` | App icon 512×512 |

All 4 files must be in the **same folder** on your web server.

---

## Prerequisites: Firebase Setup

The app uses Firebase for sign-in and cloud storage. Before deploying, make sure:

1. **Google Sign-In is enabled** in Firebase Console → Authentication → Sign-in method → Google → Enable
2. **Your hosting domain is authorized** in Firebase Console → Authentication → Settings → Authorized domains → Add domain (e.g. `yourusername.github.io`)
3. **Firestore security rules** are set (Firestore → Rules tab). Paste the entire block below and click **Publish**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {

       // Private user data
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }

       // Books subcollection — each book is its own document
       match /users/{userId}/books/{bookId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }

       // Public profiles — readable by any signed-in user, writable only by owner
       match /profiles/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && request.auth.uid == userId;
       }

       // Email → UID index (friend search) — users can only write their own entry
       match /emailToUid/{emailKey} {
         allow read: if request.auth != null;
         allow write: if request.auth != null
                      && request.resource.data.uid == request.auth.uid;
       }

       // Friend requests
       match /friendRequests/{requestId} {
         allow read: if request.auth != null && (
           resource.data.toUid   == request.auth.uid ||
           resource.data.fromUid == request.auth.uid
         );
         allow create: if request.auth != null
                       && request.resource.data.fromUid == request.auth.uid;
         allow update: if request.auth != null
                       && resource.data.toUid == request.auth.uid;
         allow delete: if request.auth != null && (
           resource.data.toUid   == request.auth.uid ||
           resource.data.fromUid == request.auth.uid
         );
       }

     }
   }
   ```

---

## Hosting: GitHub Pages (Free, Permanent)

1. Create a free account at [github.com](https://github.com)
2. New repository → name it `bookshelf-app` (or any name)
3. Upload all 4 files
4. Settings → Pages → Branch: `main` → `/(root)` → Save
5. Your URL: `https://yourusername.github.io/bookshelf-app`

Then add `yourusername.github.io` to Firebase Authorized Domains (see Prerequisites above).

---

## Opening on Your iPhone

1. On your iPhone, open **Safari** (must be Safari, not Chrome)
2. Go to your GitHub Pages URL
3. Wait for the page to fully load
4. Sign in with Google

---

## Installing to Home Screen

1. Tap the **Share** button (box with arrow, bottom of Safari)
2. Scroll down and tap **"Add to Home Screen"**
3. Name it **Bookshelf** → tap **Add**
4. The app icon appears on your home screen 📚

---

## What you get after installing

- Opens fullscreen — no Safari browser chrome
- Works offline after first load (service worker caches assets)
- Your library syncs across all devices via Firebase
- Each user's library is completely private (Google Sign-In required)
- Camera access for barcode scanning works
- Feels like a native app
- Multiple people can use the same deployment — each person signs in with their own Google account and gets a separate private library
- Use the Friends feature (profile icon → Friends) to connect with others using the app and compare reading stats

---

## Troubleshooting

**"Add to Home Screen" is greyed out**
→ You must use Safari. Chrome and other browsers don't support this on iOS.

**App doesn't load offline**
→ Visit the page once on WiFi first to let the service worker cache everything.

**Camera doesn't work**
→ iOS will ask for camera permission the first time you tap Scan. Tap Allow.

**Sign-in button does nothing**
→ Your domain is probably not in Firebase Authorized Domains. Add it in Firebase Console → Authentication → Settings → Authorized domains.

**"auth/unauthorized-domain" error**
→ Same as above — add your GitHub Pages domain to Firebase Authorized Domains.

**Data doesn't appear on another device**
→ Sign in with the same Google account. Data is linked to your Google account, not the device.

**Friend profile shows "Profile access was blocked"**
→ Your Firestore rules are out of date — they're missing the `profiles`, `emailToUid`, and `friendRequests` collections. Replace them with the full four-collection ruleset in the Prerequisites section above.

**"Add Friend" search can't find someone**
→ They need to have opened and signed into the app at least once first. Ask them to launch it, then try searching again.

---

## Updating the App

When the code changes, upload the new `index.html` to GitHub (drag and drop in the browser, or push via git). The service worker version bump refreshes the cache automatically on next load.

---

## Phase 2 Options (when you're ready)

- **Capacitor**: Wrap this same code as a real native iOS app for the App Store
- **Custom domain**: Point a domain you own at your GitHub Pages site (free in GitHub Settings → Pages → Custom domain)
- **CloudKit sync**: After Capacitor wrap, replace Firestore with CloudKit for tighter Apple ecosystem integration
