# Financial Analyzer — Mobile

Expo (SDK 54) React Native app for **iOS and Android** from one codebase.

## Why Expo

The previous `mobile/` was bare React Native with **no `android/` or `ios/` folders at
all**, so it could not build for either platform.

Expo was chosen for one decisive reason: **the development machine is Windows with no
Xcode**, and bare React Native cannot produce an iOS build there. EAS Build compiles iOS
on hosted macOS workers, so both platforms ship from this machine.

The old code is preserved at `mobile/_legacy_bare_rn/` for reference.

Targets **iOS 15.1+** and **Android 7.0+ (API 24)**.

---

## Running it

```bash
cd mobile
npm install
npm start           # then scan the QR code with Expo Go
```

Point it at a backend by setting the API URL — resolution order:

1. `EXPO_PUBLIC_API_URL` (set per build profile in `eas.json`)
2. `extra.apiUrl` in `app.json`
3. Platform dev fallback (`10.0.2.2:5001` on Android emulators, `localhost:5001` on iOS)

> The base URL already ends in `/api`, so endpoint paths must not repeat it. Requesting
> `/api/transactions` produces `/api/api/transactions` — that exact bug shipped in the
> web app.

### Local backend from a real device

An Android emulator reaches the host through `10.0.2.2`. A physical phone needs your
machine's LAN address:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.x:5001/api npm start
```

---

## Building

```bash
npm run build:android    # APK, internal distribution
npm run build:ios        # IPA via EAS (macOS workers, no Mac needed locally)
npm run build:all        # production, both platforms
```

First run of any EAS command prompts for login and writes a real `projectId` into
`app.json`. The committed placeholder must be replaced before a build succeeds.

An App Store build additionally needs an Apple Developer account; Play needs a Play
Console account. Neither is required for `preview` builds installed directly.

---

## Structure

```
src/
  api/          client.js (axios, refresh, offline cache), endpoints.js (all calls)
  contexts/     Auth, Theme, Network
  hooks/        useApi, useMutation
  navigation/   RootNavigator (auth gate), TabNavigator (5 tabs, per-tab stacks)
  theme/        tokens.js — the only place a colour is defined
  components/   ui/ (15 primitives), charts/ (3 wrappers)
  screens/      auth, dashboard, transactions, emi, budgets, bills,
                loans, investments, goals, legacy, insights, profile
  utils/        format, storage, biometrics, notifications
```

### Navigation

Five bottom tabs, each owning a native stack so back behaviour is per-tab:

| Tab | Root | Also reachable |
|---|---|---|
| Home | Dashboard | Insights |
| Money | Transactions | Transaction form, Budgets, Bills |
| Debt | EMIs | EMI detail/form, Money lent, Money borrowed |
| Wealth | Investments | Net worth, Goals |
| Profile | Profile | Settings, Security, Nominees |

---

## Conventions

- **No fabricated data.** A screen with nothing to show renders an empty state. It never
  invents numbers to fill a chart. The web app had this problem; it is not repeated here.
- **Four states everywhere**: loading skeleton, empty, error with retry, content.
- **Currency only through `formatMoney` / `formatCompact`** — INR, `en-IN` grouping, so
  ₹1,50,000 renders as `₹1.5L` rather than the misleading `₹150K`.
- **Colours only from `useTheme()`.** No raw hex in a screen; that is what makes dark mode
  work without auditing every file.
- **Tokens in SecureStore** (Keychain / Keystore), never AsyncStorage — AsyncStorage is
  unencrypted plain files. Cached API payloads may go there; credentials may not.
- **Accessibility**: every touchable carries `accessibilityLabel` and `accessibilityRole`,
  minimum 44×44 target.
- Permissions are requested **at the point of use**, never on first launch.

---

## Native capabilities

| Capability | Package | Notes |
|---|---|---|
| Biometric unlock | `expo-local-authentication` | Opt-in. The toggle is disabled with an explanation when no hardware is present or nothing is enrolled, rather than offering a control that cannot work. Labelled "Face ID" or "Fingerprint" per device. |
| Local reminders | `expo-notifications` | Bill and EMI due dates. Android channel `reminders`. Permission requested when the user first enables a reminder. |
| Receipt capture | `expo-image-picker` | Camera or library → `POST /receipts/scan` to prefill a transaction. |
| Secure storage | `expo-secure-store` | Access and refresh tokens. |
| Offline | `@react-native-community/netinfo` | Banner while offline; cached GETs are served and labelled with their age rather than passed off as live. |

---

## Verifying a change

```bash
npx expo-doctor                       # dependency and config health
npx expo export --platform android    # proves it bundles
npx expo export --platform ios

# from the repo root - these catch what bundling cannot:
node scripts/verify-mobile-endpoints.js     # every API call hits a real route
node scripts/verify-mobile-navigation.js    # every navigate() target exists
node scripts/verify-legacy-transitions.js   # claim state machine matches backend
```

Both exports must succeed. Bundling is the only real proof that the app *builds* — but it
proves nothing about whether the app *works*, which is what the three verify scripts are
for. See below.

### Failures worth remembering

**Bundling does not prove an endpoint exists.** The first version of this app shipped ten
API calls to routes that do not exist, including `GET /emi` and `POST /emi` — meaning the
EMI list and EMI form screens had never worked. Every one of them bundled cleanly and
failed only in a user's hands as a generic error. `scripts/verify-mobile-endpoints.js`
now cross-checks all 279 calls against `backend/routes/*.js` on every change.

**A screen can exist and be unreachable.** `receiptsApi` shipped with no screen at all,
and the `Notifications` route rendered `InsightsScreen`. `scripts/verify-mobile-navigation.js`
now fails on dangling `navigate()` targets and on screen files no navigator imports.

**`expo-file-system` v19 (SDK 54) throws at runtime for legacy calls.** The package moved
to a new `File`/`Paths` API. `writeAsStringAsync`, `readAsStringAsync` and friends are
still exported from the package root, but they are deprecated shims documented as *"This
method will throw in runtime"*, and `cacheDirectory` is simply `undefined` there. Import
from `expo-file-system/legacy` instead. This bundles fine either way.

**`babel-preset-expo` must match the SDK.** Installing it with plain `npm install` pulled
`57.x` against SDK 54, and Hermes then rejected React Native's own private class fields
(`#registry`, `#length`) with *"private properties are not supported"* — after bundling
1,592 modules successfully, so the error looked like application code. `npx expo install`
picks the matched version (`54.0.12`).

**A stale `package-lock.json`** from the old bare-RN app pinned React Navigation v6 and
made v7 unresolvable. Deleting the lockfile fixed it.

### Known problem: `package-lock.json` is not portable

This lockfile was generated on a machine whose npm registry is an internal corporate
proxy. All 862 `resolved` URLs point at that proxy rather than `registry.npmjs.org`, and
every `integrity` value is `sha1-` rather than `sha512-`.

Consequences outside that network: `npm ci` will fail, and `npm install` is unreliable.

It cannot be fixed from that machine — `registry.npmjs.org` is TLS-intercepted there, so
regenerating produces a lockfile with no integrity hashes at all, which is worse. On a
machine with public npm access:

```bash
cd mobile
rm package-lock.json
npm install --registry=https://registry.npmjs.org/
# confirm: grep -c 'registry.npmjs.org' package-lock.json  should match the resolved count
```

`package.json` itself is correct and portable; only the lockfile is affected.

---

## Scope

57 screens across six tabs. Covers authentication and password reset, dashboard,
transactions, receipts, EMIs, budgets, bills, credit-card bills, lending in both
directions, bank accounts, recurring payments, subscriptions, split expenses,
investments, net worth, goals, retirement, insurance, tax, credit score, family,
documents, reports and export, search, notifications, achievements, the AI assistant,
and the full Legacy Guard estate-settlement workflow (nominees, dormancy cases, estate
cases, recovery claims, settlement and the nominee portal).

Five tabs could not hold that, so anything that is not a daily-use surface lives behind
the **More** hub rather than being built and then left unreachable.

The web app has ~160 pages. This is still not all of them and does not pretend to be —
the long tail (enterprise V3 consoles, the AI laboratory pages, admin tooling) is
deliberately absent. Those are desktop workflows, and shipping thin imitations of them on
a phone would be worse than leaving them out.

### What is deliberately not faked

No screen invents data. Where the backend returns nothing, the screen says so rather than
rendering a plausible number:

- a course or account with no history shows an empty state, not a zero
- a credit score is shown only when the API returns one — never estimated
- AI features report the backend's own "not configured" message rather than substituting
  a canned reply
- an export reports success only after a file is actually written to disk
