# Trikon ERP — mobile app (Android + iOS)

This folder is a **separate React Native app** built with **Expo (SDK 58, React Native 0.88)**.
It does **not** change anything in `client/` or `server/` — the web portal keeps working exactly as before.
The app talks to the same backend: `https://api.erp.mwm247.com/api`.

---

## 1. What is inside

| Part of the app | How it works |
|---|---|
| Login (Portal / Team toggle) | Native screen. "Portal" → `POST /api/portal/auth/login` (employee, investor, customer, supplier/vendor — one form, the server decides the role). "Team (ERP)" → `POST /api/auth/login`. |
| Tokens | Saved in the phone's secure keychain/keystore (`expo-secure-store`) under the same names the web uses: `token`/`user` and `portalToken`/`portalUser`. A 401 logs you out, like the web. |
| Employee portal | **Native**: Dashboard (check-in/out, running task timer, salary card with password unlock, payslip download), Tasks, Task detail (timer, progress, status, subtasks, chat with attachments), Attendance (calendar, month/year, correction request), Day off/Leave, Advance/Loan, My Requests (cancel pending), Work log (+ manual time), Material requisitions, Notifications, Profile + change password. |
| Investor portal | **Native**: Overview, Investments (+ search/filter), Investment detail, History (filters), Projections (compare), Payouts, Inbox (messages, documents download, notes, activity), Profile + change password. |
| Customer portal | **Native**: Dashboard, Invoices (PDF download/share), Quotes (accept/reject), Requests (create + list), Notifications. |
| Supplier / vendor portal | **Native**: Dashboard, Purchase orders (+ detail: confirm, ship/deliver, invoice PDF, confirm payment, payment history), Material requisitions (+ submit / edit quotation), Earnings, Invoices, Requests, Notifications. |
| Admin / staff ERP (~150 web screens) | Native home screen with role-filtered shortcuts. Each shortcut opens the **real web ERP** (`https://erp.mwm247.com`) inside the app (WebView), already logged in — the app puts the same `token`/`user` into the page's localStorage that the web login would. Logging out on the web page also logs out the app. |

Folder map:

```
mobile/
  App.js                    app entry (navigation + auth provider)
  app.config.js             name, package id, icons, permissions, API URL
  eas.json                  cloud build profiles (development / preview APK / production AAB)
  src/config.js             API_URL / WEB_URL (+ Android emulator localhost → 10.0.2.2 in dev)
  src/storage/tokenStore.js secure storage (replaces localStorage)
  src/api/                  staff axios client + login
  src/portal/api/           the web portal API files, ported 1:1 (same endpoints & payloads)
  src/screens/...           native screens (auth, staff, portal, employee, investor)
  src/components/ui.js      small UI kit matching the web's Tailwind look
```

---

## 2. One-time setup on Windows

1. Install **Node.js 20 LTS or newer** from https://nodejs.org (tick "Add to PATH").
2. Open **PowerShell** and go to the folder:
   ```powershell
   cd D:\erp-dashboard\mobile
   npm install
   ```

## 3. Try it on your phone right now (no build needed) — Expo Go

> Expo Go must support SDK 58. If the Play Store / App Store version says the project is too new, use the APK in step 4 instead.

```powershell
cd D:\erp-dashboard\mobile
npx expo start
```
Install **Expo Go** on the phone, scan the QR code shown in PowerShell (phone and PC on the same Wi-Fi).
The app uses the live API by default. To point at your local server instead, create `.env` from `.env.example`:
```
EXPO_PUBLIC_API_URL=http://192.168.x.x:5000/api   # your PC's LAN IP when testing on a real phone
APP_VARIANT=development
```
(On the Android **emulator** `http://localhost:5000/api` is fine — the app maps it to `10.0.2.2` automatically.)

---

## 4. Build the Android APK

### Option A — on your Windows PC (free, no account)

One-time:
1. Install **Android Studio** (https://developer.android.com/studio). Open it once → *More Actions → SDK Manager* → install **Android SDK Platform 36** and **Android SDK Build-Tools 36**.
2. Install **JDK 17** (Android Studio ships one at `C:\Program Files\Android\Android Studio\jbr`).
3. Set environment variables (PowerShell, then reopen PowerShell):
   ```powershell
   setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
   setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
   setx PATH "$env:PATH;$env:LOCALAPPDATA\Android\Sdk\platform-tools"
   ```

Build:
```powershell
cd D:\erp-dashboard\mobile
npm install
npx expo prebuild -p android --clean
cd android
.\gradlew.bat assembleRelease
```
The APK appears at `mobile\android\app\build\outputs\apk\release\app-release.apk`.

- Smaller/faster build for modern phones only: `.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a`
- Debug build (needs the Metro dev server running): `.\gradlew.bat assembleDebug`
- Or simply `npx expo run:android` with a phone plugged in (USB debugging on) — builds, installs and starts it.

> The release APK is signed with the **Android debug key**. That is fine for installing on your own / staff phones,
> but the **Play Store will not accept it** — see section 7.

### Option B — in the cloud with EAS (no Android Studio needed)
```powershell
npm install -g eas-cli
eas login                      # free Expo account
eas init                       # links the project (adds projectId to app.config.js extra.eas)
eas build -p android --profile preview      # → downloadable .apk
eas build -p android --profile production   # → .aab for the Play Store (EAS creates & stores the upload key for you)
```

## 5. Install the APK on a phone

- **Easiest:** copy `trikon-erp.apk` to the phone (USB cable, Google Drive, WhatsApp to yourself…), tap it,
  allow **"Install unknown apps"** for the app you opened it with (Files/Drive/Chrome), then **Install**.
- **With a cable:** enable *Developer options → USB debugging* on the phone, then
  ```powershell
  adb install -r D:\erp-dashboard\mobile-delivery\trikon-erp.apk
  ```
- Updating: install the newer APK over the old one (same package `com.trikon.erp`, same signing key). If Android says
  "App not installed" because the signature differs, uninstall the old app first.

---

## 6. iOS (iPhone / iPad)

You cannot build iOS apps on Windows. Choose one:

1. **Quick test:** Expo Go on the iPhone + `npx expo start` (section 3).
2. **Cloud build (recommended):** needs an **Apple Developer account ($99/year)**.
   ```powershell
   eas build -p ios --profile preview      # ad-hoc install on registered iPhones (EAS asks to register device UDIDs)
   eas build -p ios --profile production   # App Store / TestFlight build
   eas submit -p ios                       # upload to App Store Connect / TestFlight
   ```
3. **On a Mac with Xcode 16+:** `npm install && npx expo run:ios` (simulator) or `npx expo run:ios --device`.

Bundle identifier is `com.trikon.erp` (change in `app.config.js` if you register a different one).

---

## 7. Follow-ups before going public

- **Play Store signing.** Create your own upload key once and keep it safe (losing it = cannot update the app):
  ```powershell
  keytool -genkeypair -v -storetype PKCS12 -keystore trikon-upload.keystore -alias trikon-upload -keyalg RSA -keysize 2048 -validity 10000
  ```
  Put the file in `android\app\`, and add to `%USERPROFILE%\.gradle\gradle.properties` (NOT in the repo):
  ```
  TRIKON_UPLOAD_STORE_FILE=trikon-upload.keystore
  TRIKON_UPLOAD_KEY_ALIAS=trikon-upload
  TRIKON_UPLOAD_STORE_PASSWORD=*****
  TRIKON_UPLOAD_KEY_PASSWORD=*****
  ```
  then in `android/app/build.gradle` add a `release` entry under `signingConfigs` that reads those four properties and set
  `buildTypes.release.signingConfig signingConfigs.release`, and build `.\gradlew.bat bundleRelease` (→ `.aab`).
  Because `android/` is regenerated by `expo prebuild --clean`, the simpler path is **`eas build -p android --profile production`**, which manages the key for you.
- **HTTPS on older Android (fixed in 1.0.1):** the API certificate chains to *SSL.com TLS RSA Root CA 2022*, which older
  Android phones (e.g. Android 13 and below) don't have. The app bundles that root (`plugins/certs/`) and trusts
  *system CAs + this root* via `plugins/withNetworkSecurityConfig.js` (re-applied on every `expo prebuild`). Cleartext
  (http) stays blocked in release builds. If the server ever switches CA, check this plugin.
- **Version bumps:** raise `version`, `android.versionCode` and `ios.buildNumber` in `app.config.js` for every store release.
- **Push notifications:** the portal currently uses in-app notifications + Socket.IO. Phone push needs `expo-notifications`, an EAS project id, FCM (Android) / APNs (iOS) keys, and a small server change to store device tokens and send pushes.
- **CORS:** not needed for the native screens (phones don't enforce CORS). The admin WebView loads `erp.mwm247.com`, which already calls the API today, so nothing changes.
- **Forgot password:** the server has no portal forgot-password endpoint yet, so the app tells users to contact HR/office.
- **Icons/splash:** generated from `client/src/assets/trikon-logo.png` (`assets/`). Replace with designer files any time.
- **Admin screens natively:** the WebView section can be replaced screen by screen with native ports later (start with Approvals and Dashboards).

## 8. Checks

```powershell
npm run lint          # ESLint (expo config)
npm test              # Jest smoke test: all 31 native screens render with sample API data (API mocked, no network)
npx expo-doctor       # dependency / config health
npx expo export --platform android --platform ios --output-dir dist-check   # proves both JS bundles build
```
