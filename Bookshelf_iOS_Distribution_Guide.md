# 📱 Bookshelf — Native iOS/iPadOS/macOS Distribution Guide

**Goal:** Package the Bookshelf PWA as a real native app using Capacitor, then share it with a few testers via TestFlight — no App Store submission required for external testing.

**Time to complete:** ~3–4 hours the first time  
**What testers get:** A native app install link they tap in Safari — no sideloading, no developer mode, no friction.

---

## Overview of the Approach

```
index.html (your PWA)
       ↓
  Capacitor wraps it in a native WKWebView
       ↓
  Xcode builds a signed .ipa binary
       ↓
  Upload to App Store Connect
       ↓
  TestFlight distributes to testers via a link
```

Capacitor is not a code transpiler — it doesn't touch your HTML/JS/CSS. It creates a native iOS project that loads your `index.html` inside a fullscreen WKWebView. Camera, barcode scanner, and all web APIs work exactly as in Safari, plus you get access to native APIs when needed.

---

## What You Need

| Requirement | Notes |
|-------------|-------|
| **Mac** running macOS 14+ (Sonoma or later) | Required — Xcode only runs on Mac |
| **Xcode 16+** | Free from the Mac App Store |
| **Node.js v20+** | Install from [nodejs.org](https://nodejs.org) |
| **Apple Developer Program** | $99/year at [developer.apple.com/enroll](https://developer.apple.com/enroll) — required for TestFlight |
| **Apple ID** | Must be the one enrolled in the Developer Program |

> If you don't have an Apple Developer account yet, sign up first — it takes 24–48 hours to activate.

---

## Part 1: Project Setup

### Step 1 — Create a project folder

Open **Terminal** and run:

```bash
mkdir bookshelf-native
cd bookshelf-native
```

Copy your `index.html`, `manifest.json`, `icon192.png`, and `icon512.png` into this folder. Then:

```bash
npm init -y
```

### Step 2 — Install Capacitor

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
```

### Step 3 — Initialize Capacitor

```bash
npx cap init
```

When prompted:

| Prompt | Enter |
|--------|-------|
| App name | `Bookshelf` |
| App Package ID | `com.yourname.bookshelf` *(use your name, e.g. `com.jsmith.bookshelf`)* |
| Web assets directory | `.` *(a single dot — your files are in the root)* |

> **Package ID** must be unique and in reverse-domain format. You'll never submit to the App Store so it doesn't need to be globally unique — just pick something consistent.

### Step 4 — Configure Capacitor

Open the generated `capacitor.config.json` and make sure it looks like this:

```json
{
  "appId": "com.yourname.bookshelf",
  "appName": "Bookshelf",
  "webDir": ".",
  "server": {
    "androidScheme": "https"
  },
  "ios": {
    "contentInset": "always"
  }
}
```

The `contentInset: always` ensures the app respects the iPhone's safe areas (notch, home indicator).

### Step 5 — Add the iOS platform

```bash
npx cap add ios
```

This creates an `ios/` folder containing a full Xcode project. This is your native app.

---

## Part 2: App Icons

Capacitor needs icons in specific sizes. Your current `icon192.png` and `icon512.png` are a good starting point, but iOS requires many sizes.

### Option A — Use an icon generator (recommended)

1. Go to [appicon.co](https://appicon.co) or [makeappicon.com](https://makeappicon.com)
2. Upload your `icon512.png`
3. Download the iOS icon set
4. In Xcode: open `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
5. Replace the placeholder icons with the downloaded ones, matching the filenames

### Option B — Let Xcode handle it

Open Xcode (next step), click on `AppIcon` in the asset catalog, and drag your 1024×1024 icon into the single slot — Xcode will generate all the sizes automatically in Xcode 16+.

---

## Part 3: Open and Configure in Xcode

### Step 6 — Open the iOS project

```bash
npx cap open ios
```

Xcode opens automatically with your project.

### Step 7 — Sign the app

This is the critical step that enables real-device installation.

1. In Xcode, click **App** in the left sidebar (the blue project icon at the top)
2. Click the **App** target (not "App Tests")
3. Click the **Signing & Capabilities** tab
4. Check **Automatically manage signing**
5. Under **Team**, select your Apple Developer account from the dropdown
   - If it's not there, go to **Xcode → Settings → Accounts** and sign in with your Apple ID

Xcode will automatically create a provisioning profile and signing certificate for you.

### Step 8 — Set deployment target

Still in the **General** tab of the App target:

- **Minimum Deployments:** Set to `iOS 16.0` (covers 99%+ of active iPhones)
- **iPhone/iPad/Mac:** Check all three for universal support

### Step 9 — Set the display name

In **General → Identity:**
- **Display Name:** `Bookshelf`
- **Version:** `1.0`
- **Build:** `1`

### Step 10 — Configure permissions (for camera)

Your app uses the camera for barcode scanning. iOS requires a usage description string.

In Xcode, find `ios/App/App/Info.plist`:

1. Click the `+` button to add a new row
2. Key: `NSCameraUsageDescription`
3. Value: `Bookshelf uses your camera to scan book barcodes and identify covers.`

> Without this, the barcode scanner will crash silently on a real device.

---

## Part 4: Test on Your Own Device First

Before sharing with anyone, run it on your own iPhone to verify everything works.

### Step 11 — Connect your iPhone via USB

1. Plug in your iPhone with a Lightning or USB-C cable
2. On your iPhone, tap **Trust** when prompted
3. In Xcode, click the device selector at the top (it probably says "iPhone 16 Simulator" or similar)
4. Select your physical iPhone from the list

### Step 12 — Build and run

Press the **▶ Play button** in Xcode (or `Cmd + R`).

Xcode will:
- Compile the project
- Install it on your iPhone
- Launch the app

**First launch:** You may see "Untrusted Developer" on your iPhone. Go to:
**Settings → General → VPN & Device Management → [Your Apple ID] → Trust**

The app should open and your library should work exactly as in Safari.

### What to verify on your device

- [ ] App launches, books display correctly
- [ ] Dark/light mode toggle works
- [ ] Barcode scanner opens camera and requests permission
- [ ] Cover photo scanner works
- [ ] Search returns results (requires internet)
- [ ] Backup download works
- [ ] Tapping book cards opens detail modal
- [ ] Bottom nav switches tabs correctly

---

## Part 5: Prepare for TestFlight

### Step 13 — Create your app in App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click **My Apps → + → New App**
3. Fill in:
   - **Platform:** iOS
   - **Name:** `Bookshelf`
   - **Primary Language:** English
   - **Bundle ID:** Select the one Xcode created (matches your `appId`)
   - **SKU:** `bookshelf-1` (any unique string, internal only)
   - **User Access:** Full Access
4. Click **Create**

### Step 14 — Archive and upload the build

Back in Xcode:

1. Change the device target from your iPhone to **"Any iOS Device (arm64)"** — the generic destination for distribution builds

2. Go to **Product → Archive**
   - This compiles a release build and opens the Organizer window
   - Takes 1–3 minutes

3. In the Organizer, select your archive and click **Distribute App**

4. Choose **App Store Connect** → **Next**

5. Choose **Upload** → **Next**

6. Leave all options checked (symbols, manage version/build number) → **Next**

7. Xcode automatically signs the build → **Upload**

Wait 5–10 minutes for App Store Connect to process the build.

### Step 15 — Set up TestFlight

Back in App Store Connect:

1. Click **TestFlight** tab on your app
2. You'll see your build appear (may take a few minutes, status: "Processing")
3. Once processing completes, click the build
4. Fill in **Test Information:**
   - **What to Test:** "A personal book library tracker — add books by barcode scan, cover photo, or search. Please test adding books, tracking reading progress, and the barcode scanner."
   - **Feedback Email:** your email address
5. Click **Save**

---

## Part 6: Share with Testers

For a small group of friends, you have two options. **Internal testing** is simpler and doesn't require Apple review. **External testing** requires a one-time Apple review (~24 hours) but gives you a public link.

### Option A: Internal Testers (Simplest — No Review)

Use this for up to 25 people who you can add to your App Store Connect account.

1. In App Store Connect → **Users and Access** → **+ Add User**
2. Enter each tester's Apple ID email
3. Role: **Customer Support** (lowest permissions, still gets TestFlight access)
4. They'll receive an email invitation

Then in **TestFlight → Internal Testing:**
1. Click **+** to create a new internal group
2. Add testers to the group
3. Add your build to the group
4. Testers receive an email with a TestFlight link

**Tester instructions:** "Install TestFlight from the App Store, then tap the link in the invitation email."

### Option B: External Testers (Up to 10,000 — Requires One Review)

This lets you share a public link anyone can tap.

1. In **TestFlight → External Testing → +** create a new group named "Beta Testers"
2. Add your build to the group
3. Click **Submit for Review** — Apple reviews the build (typically within 24 hours, sometimes faster)
4. Once approved, go to the group → **Testers tab → Create Public Link**
5. Copy the link (looks like `https://testflight.apple.com/join/xxxxxxxx`)
6. Share via text, email, or iMessage

**Tester instructions:** "Tap the link, install TestFlight if prompted, then tap Install."

> **Note:** External builds expire after 90 days. You'll need to upload a new build and add it to the group to keep testers on the latest version.

---

## Part 7: Updating the App

When you update `index.html` and want to push an update to testers:

```bash
# From your bookshelf-native folder:
npx cap sync ios
```

Then in Xcode:
1. Bump the **Build** number in General → Identity (1 → 2 → 3, etc.)
2. **Product → Archive**
3. **Distribute App → Upload**
4. In App Store Connect → TestFlight, add the new build to your tester group

Testers receive a notification and can update from within the TestFlight app.

---

## Part 8: macOS (Mac Catalyst)

When you checked the "Mac" checkbox in Step 8, Xcode also compiles a macOS version using Mac Catalyst. This runs your app natively on Macs with Apple silicon (M1/M2/M3/M4).

To build for macOS:
1. Change the destination to **"My Mac (Mac Catalyst)"**
2. Run/Archive as normal

Mac builds can also be distributed via TestFlight — in App Store Connect they appear as a separate platform under the same app.

---

## Part 9: iPadOS

Your app runs on iPad automatically since you checked iPad in Step 8. The WKWebView scales to fill the larger screen. The app layout uses `maxWidth: 540px` centered, so it looks like a phone-sized column on iPad — which is fine for a personal tool.

To optimize for iPad later, you can add responsive breakpoints to your CSS.

---

## Troubleshooting

**"No provisioning profile" error in Xcode**
→ Make sure you're signed in under Xcode → Settings → Accounts with your Developer Program Apple ID. Then re-check "Automatically manage signing."

**Camera doesn't work on device**
→ Verify `NSCameraUsageDescription` is in `Info.plist`. Delete and re-install the app.

**App shows blank white screen**
→ The app loaded but can't find the assets. Check that `webDir` in `capacitor.config.json` is `.` (a dot), and that `index.html` is in the root of your project folder.

**"This build is using a beta version of Xcode" error when submitting**
→ Make sure you're running a release version of Xcode, not an Xcode beta. Check **Xcode → About Xcode**.

**Build stuck on "Processing" in App Store Connect for more than 30 minutes**
→ This occasionally happens. Wait it out or try uploading again from Xcode Organizer.

**Barcode scanner shows camera but doesn't scan**
→ This is expected in the iOS Simulator — it has no camera. Test on a real device.

**TestFlight says "build not available" to testers**
→ For external testers, the build must pass Apple's TestFlight review first. Check the build status in App Store Connect.

---

## Quick Reference — Key Commands

```bash
# After updating index.html, sync to Xcode:
npx cap sync ios

# Open Xcode:
npx cap open ios

# If you ever need to re-add the iOS platform:
npx cap add ios
```

---

## What's Next (After Testing)

Once testing goes well, these are the natural next steps toward a polished app:

1. **CloudKit sync** — Replace localStorage with CloudKit via a Swift plugin. Data syncs across all the tester's Apple devices and persists if they clear Safari.

2. **Native barcode scanner** — Replace the ZXing web scanner with `@capacitor-mlkit/barcode-scanning` for faster scanning, torch support, and better low-light performance.

3. **Haptic feedback** — `@capacitor/haptics` for satisfying taps when adding books or changing status.

4. **Push notifications** — `@capacitor/push-notifications` for reading reminders.

5. **App Store submission** — Once the app is polished and you want broader distribution, the Xcode archive is already the correct format. App Store submission is one extra step from where you'll be.

---

*Guide written May 23, 2026 for Bookshelf PWA (SW v14, Capacitor v7+)*
