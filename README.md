# PitakGo — cumulative development build

Current source baseline: v0.47, with cumulative fixes in progress. This folder is the working project; intermediate archives are intentionally not sent during development.

## Local checks

```powershell
node --check .\www\online.js
node .\tests\static-check.mjs
```

## Android

```powershell
npm install
powershell -ExecutionPolicy Bypass -File .\SETUP_ANDROID.ps1
```

The setup script also checks for installed Capacitor dependencies and runs `npm install` automatically if they are missing.

The setup script creates/synchronizes the Capacitor Android project if needed, installs the supplied launcher icons, and opens Android Studio. Keep the `android` folder when updating an existing local checkout.

## Verification status

Static checks currently pass. Interaction testing on Samsung/Android, full booking testing with two real accounts, and production Supabase schema/RLS verification are still required before calling this release-ready. Do not treat static checks as a substitute for device/backend tests.

See `DEVELOPMENT_LOG.md` for cumulative changes and `BACKEND/README.md` before touching SQL files.


## Research update — batch 14 (2026-10-28)
Research leads dataset version 0.12.0, 154 entries. Added public Telegram route-community leads across Andijan, Fergana, Samarkand, Karakalpakstan, Surkhandarya, Khorezm, and Kashkadarya. These are not confirmed physical taxi stands; pickup coordinates remain null. No Supabase upload.
