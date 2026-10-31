PitakGo v0.25 — hotfix of v0.24 regression.

Based on v0.23 (not v0.24). Keeps v0.23 services, bookings, deletion, driver/passenger registration.
- Removed faulty v0.24 history code causing a ReferenceError (`prev` not declared).
- Startup renders guest screen immediately, without waiting for Supabase refresh.
- Android Back intercepted with Capacitor App plugin; synchronous in-memory navigation stack.
- iOS visible back button and supported browser back gesture (history fallback).
- Root Back stays inside app.
- Added @capacitor/app dependency; requires npm install and cap sync android.

Checked JavaScript syntax, ZIP integrity, and startup declaration order. Physical-device behavior still needs confirmation.
