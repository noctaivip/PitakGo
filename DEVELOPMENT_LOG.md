# PitakGo cumulative development log

## Baseline
- Imported the complete source package from PitakGo v0.47.
- The source tree is tracked in local Git so changes can be accumulated without sending intermediate archives.
- No Supabase schema or production data was modified.

## 2026-10-23 — Android driver picker activation
- Root-cause hypothesis: visible location buttons were nested inside `<label>` elements alongside hidden `<select>` controls, allowing label activation to synthesize an extra control click on Android WebView.
- Converted the five driver location controls to non-label wrapper blocks.
- Added an explicit, single click handler to the visible picker button and disabled duplicate auto-binding for those buttons.
- Preserved the same full-screen region → city/district → concrete pitak flow.
- `node --check www/online.js` passes.
- Browser/device interaction test could not run in this environment because navigation is blocked by the execution environment. This is not claimed as Samsung-tested.

## Verification constraints
- Production Supabase inspection was denied by available permissions; no production writes were attempted.
- Need real-device testing of picker, two-account booking, driver confirmation, seat availability, and Android back/navigation before declaring release-ready.

## 2026-10-23 — Driver data integrity and UI regression checks
- Added explicit empty choices to pitak selects so an empty profile never silently selects the first catalog entry.
- Saving a car now requires a concrete main pitak.
- Publishing a trip now requires the driver to be online and the route origin to match the selected working pitak.
- Work status changes require a working pitak for `ready`/`resting`, while allowing an unconfigured driver to go offline.
- Duplicate driver-pitak links are handled as an already-added state rather than a fatal save error.
- Fixed HTML escaping of apostrophes (`'`), which appear frequently in Uzbek names and transliterations.
- Added `tests/static-check.mjs`; it checks syntax, duplicate function declarations, picker bindings, required trip guards, empty select behavior, apostrophe escaping, and absence of a service-role key in frontend JS.
- `node --check www/online.js` and `node tests/static-check.mjs` pass.
- Booking requests now require a passenger name and a minimally valid phone number; repeated taps while a booking or driver decision is processing are ignored until the request finishes.
- Driver trip cards now distinguish confirmed seats from pending requests and explicitly show when every passenger seat is confirmed, without auto-marking the trip as departed.

## 2026-10-23 — Modal-first Android Back behavior
- Found a navigation edge case during the next audit: Android/system Back and the global Escape handler could navigate the underlying screen while the full-screen location picker was open.
- Updated `pgBack()` to close the location picker first (and restore the body scroll class), and to close the local demo overlay before navigating underlying screens.
- Stopped Escape key propagation from the picker so it cannot also trigger global navigation.
- Added regression checks for both modal-first rules and Escape propagation.
- `node --check www/online.js` and `node tests/static-check.mjs` pass. Browser interaction test is unavailable because browser navigation is blocked in this environment; no device testing is claimed.

## 2026-10-23 — Duplicate-action and price validation hardening
- Prevented rapid repeated taps from starting parallel save-car or publish-trip requests.
- Prevented duplicate community-offer submissions per listing while the request is in flight.
- Added client-side validation that offer/publication prices are whole numbers in the supported 0–100,000,000 UZS range; backend validation remains authoritative.
- Extended static regression tests for these protections.
- `node --check www/online.js` and `node tests/static-check.mjs` pass. No live database writes were made.

## 2026-10-23 — Booking and driver status action guards
- Added a shared in-flight guard for closing a trip, cancelling a booking, and removing a trip from active listings.
- Disabled the relevant action button while each server request is pending; duplicate taps are ignored.
- Added the same pending-request protection to ready/rest/offline status actions.
- Extended static regression tests; syntax and all static checks pass.
- Extended modal-first Back handling to the first-login welcome dialog, using its existing close action so dismissal is persisted consistently.

## 2026-10-23 — API request header pass-through
- Found that the shared API helper silently ignored custom request headers even though driver registration requested PostgREST upsert semantics via `Prefer: resolution=merge-duplicates`.
- Updated the helper to preserve explicit extra headers while still setting the app's API key and authenticated bearer token as usual.
- Added a regression test for header pass-through; syntax and static checks pass.

## 2026-10-23 — Recoverable vehicle registration
- Found a partial-save edge case: if driver profile creation succeeded but vehicle saving failed, the in-memory profile stayed empty and retrying could hit a duplicate profile key before saving the vehicle.
- Refresh the profile from Supabase immediately after writing the driver profile and before writing the vehicle, so retry follows the update path.
- Added a regression check; JavaScript syntax and all static checks pass.

## 2026-10-23 — Occupied seat map rendering
- Found a seat-map rendering edge case: after selecting a free seat, the shared UI update could change disabled/occupied seats' CSS class to “free”, making their state visually misleading.
- The seat update now leaves disabled seats untouched and normalizes seat numbers from API responses to numbers before comparisons.
- Added regression checks for both behaviors; syntax and static tests pass.

## 2026-10-23 — Prevent publishing from an unsaved work pitak
- Publishing previously compared the route origin with the currently selected UI value, but did not explicitly check that the selected work pitak had already been persisted to the driver profile.
- Added a guard requiring the selected work pitak to match the profile's saved `active_pitak_id`; the driver must confirm “Готов к работе” after changing work location.
- Added a regression test; syntax and static checks pass.


## 2026-10-23 — Narrow booking data retrieval
- The trip feed previously requested up to 300 booking rows without a server-side ownership filter, including passenger names and phone numbers, then discarded unrelated rows in the browser.
- Changed it to request the signed-in passenger's own bookings separately from bookings belonging to the signed-in driver's currently open trips. The two result sets are merged and de-duplicated before rendering.
- This reduces unnecessary personal-data retrieval and payload size, but does not replace a proper Supabase RLS policy audit. Live database permissions remain unavailable, so production policies were not changed or certified.
- Added static regression checks for ownership-scoped queries and de-duplication.

## Product differentiation ideas to validate before implementation
- **Pitak Pulse:** a clear, honest live signal for each stand—drivers on line, open seats, and passenger demand—only when backed by fresh server data; never show stale counts as live.
- **Smart repeat route:** let a passenger repeat a previous route in a couple of taps, with the seat and driver reconfirmed rather than silently rebooking.
- **Stand identity card:** one verified card per pitak with landmark, directions, city/district, and community corrections reviewed before publication.
- **Trip trust trail:** show only verifiable signals (driver profile/vehicle registration, confirmed booking, route status, and timestamps), not invented ratings or unverified badges.
- These are product backlog ideas, not yet advertised as completed features. Prioritize usefulness and data integrity over decorative novelty; validate backend support and privacy first.

## 2026-10-23 — Limit passenger booking reads to visible open trips
- Tightened the passenger booking request again: it now filters by both the signed-in passenger ID and the set of currently listed open trip IDs, rather than requesting the passenger's entire booking history on every feed refresh.
- Driver booking details remain a separate query limited to the signed-in driver's own open trips.
- If there are no open trips, the feed skips booking-table queries entirely.
- Added static checks for the visible-trip and signed-in-user filters. JavaScript syntax and all static checks pass.
- This is a data-minimization improvement only; correct Row Level Security policies still need an authorized read-only review in Supabase.

## 2026-10-23 — Pitak Pulse freshness and refresh controls
- Improved the existing “Живой пятак” signal with a manual refresh control, a visible last-fetched time, and accessible live status announcements.
- Prevented overlapping refresh requests and made network failure messaging explicit instead of displaying a raw server error in this public-facing section.
- Clarified that counts are drivers who marked themselves ready, not GPS-confirmed queues or guaranteed cars; this limitation remains visible in the UI.
- Added static regression checks for the refresh control, duplicate-request guard, and timestamp. JavaScript syntax and all static checks pass.

## 2026-10-23 — Normalize occupied seat numbers at data ingestion
- Normalized seat numbers to numbers as soon as the occupied-seat RPC response is grouped by trip. This keeps both the visual seat map and the “any seats left?” check consistent when PostgREST returns numeric values as strings.
- Added a regression check for normalization at ingestion. Syntax and all static checks pass.

## 2026-10-23 — One-tap repeat of the last booked route
- Added a passenger convenience shortcut after a successful standard trip booking: the last origin/destination pair can be repeated with one tap to filter for that exact route.
- The shortcut is scoped to the signed-in user's local device storage and stores only public pitak IDs plus a timestamp; it does not store the passenger's name, phone, or booking details.
- The shortcut appears immediately after a successful booking, validates that both pitaks still exist in the current catalog, and still requires the passenger to choose a current available trip and seat—there is no automatic rebooking.
- Added regression checks for account-scoped storage, the shortcut, data minimization, and immediate display. JavaScript syntax and all static checks pass; real-device interaction testing remains pending.

## 2026-10-23 — Prevent stale trip-feed responses
- Found a navigation/race condition: overlapping feed refreshes could finish out of order, allowing an older response to redraw the feed after a newer refresh or after navigating to Services.
- Added a monotonically increasing request sequence. Only the latest active refresh may render its results or show its error; navigating into Services invalidates earlier refreshes when a new refresh is triggered.
- Added regression checks for request sequencing, stale-response suppression, and stale-error suppression.
- `node --check www/online.js`, `node --check www/app.js`, and `node tests/static-check.mjs` pass. No production database was changed; real-device/network race testing remains pending.

## 2026-10-23 — Retry-safe driver pitak registration
- Hardened the post-signup linking of a driver's home and optional second pitak. Previously all link errors were swallowed, so a temporary network or permission failure could be followed by clearing the pending registration and leaving the driver's stand links incomplete.
- Duplicate/unique-key conflicts remain harmless, but other errors now keep registration pending and visible for retry. This is safe for a partial success: the profile and vehicle are checked again on retry, and already-created links are treated as duplicates.
- Added regression checks for both home and second pitak links. `node --check www/online.js`, `node --check www/app.js`, `node tests/static-check.mjs`, and `git diff --check` pass. No live Supabase writes were made.

## 2026-10-23 — Guard pitak requests and admin review against repeat taps
- Added per-account in-flight guards to driver-submitted new-pitak requests and admin approval/rejection actions, preventing double taps from creating duplicate requests or submitting the same review twice while a server call is in progress.
- Added explicit length limits for city, proposed pitak name, and landmark details to catch accidental oversized input before sending it to Supabase.
- Clear the request form after a successful submission only; failures preserve the entered text for retry. Admin action buttons are disabled while the review is being processed and restored if the request fails.
- Added static regression checks. JavaScript syntax, static checks, and `git diff --check` pass. Live backend and Android interaction remain unverified.


## 2026-10-23 — Isolate inbox refreshes across account changes
- Found an account-switch race in community inbox polling: a slow response started for one signed-in account could finish after logout and update notification snapshots or the inbox badge after the UI had moved on.
- Inbox polling now tags each request with the account ID and a unique request token. Results are ignored if the account or active poll changed; logout invalidates the in-flight poll. The guard still permits a newly signed-in account to start its own refresh while an older request winds down.
- Added static regression checks for account scoping, stale-response suppression, and logout invalidation. This is client-side race protection, not a substitute for server-side RLS.


## 2026-10-23 — Prevent duplicate community chat messages
- Closed a second-submit path in the community chat: the send button was disabled during a request, but the Ctrl/Command+Enter shortcut could still call the send function again while the first message was pending.
- The send function now checks the in-flight disabled state itself, so both the button and keyboard shortcut share the same duplicate-submit protection. Added a regression check.


## 2026-10-23 — Guard community-offer withdrawal against repeat taps
- Added a per-offer in-flight guard to the withdrawal action and disable its button while the request is running. This avoids repeated withdrawal RPC calls from fast taps and restores the control after a failure or completion when the original button remains mounted.
- Added a static regression check. This prevents duplicate client submissions but does not replace idempotency or authorization checks on the server.


## 2026-10-23 — Protect community post close/delete actions
- Added per-post in-flight guards for closing and deleting service marketplace posts, with buttons disabled during requests and restored on completion if still mounted.
- Both client actions now include the signed-in owner's ID in the update filter. Supabase Row Level Security remains the authoritative permission boundary; client-side filtering alone is not security.
- Added a static regression check for owner scoping and duplicate-action protection.


## 2026-10-23 — Discard stale community chat refreshes
- Added a monotonic request sequence to the offer thread loader. If manual refresh, a message notification refresh, or navigation starts a newer load, the older response is ignored before it can redraw the conversation or replace a current error state.
- Checks are made after both the offer lookup and message lookup, and errors are shown only for the still-current thread request. Added static regression checks.


## 2026-10-23 — Reject past times on new community posts
- When a user supplies a departure/request time for a community post, the form now rejects invalid or already-past timestamps instead of publishing an immediately outdated offer. Leaving the time blank remains allowed.
- Added a regression check. This is client-side input validation; server-side validation would still be needed to enforce the rule for other clients.


## 2026-10-23 — Keep live pitak refresh tied to the visible screen
- Fixed a navigation race where a refresh started on one Services screen could keep a global busy flag set after that screen was replaced. Returning to Services during the request could leave the new screen stuck on its initial loading message.
- Refreshes are now tied to the actual rendered count element and a unique request token. A new screen can refresh independently, and results/errors from detached or superseded screens are ignored. Same-screen duplicate refreshes remain blocked.
- Updated regression coverage for screen-scoped refresh behavior.


## 2026-10-23 — Make Android setup self-check dependencies
- The setup script now checks for the local Capacitor core package and runs `npm install` if dependencies are missing, stopping with an explicit error if installation fails. This avoids a confusing first-run failure when the project ZIP is unpacked without `node_modules`.
- Updated the README to show the Windows PowerShell setup command and added a static check for the dependency bootstrap. The script itself was not executed on Windows in this environment.


## 2026-10-23 — Extend static checks to inline HTML scripts
- Expanded the static test suite to parse inline JavaScript embedded in `index.html`, `online.html`, and `demo.html`, in addition to the standalone application scripts. This catches syntax errors that a check of only `online.js` and `app.js` would miss.
- Verified the three HTML files' inline scripts and confirmed the project JSON configuration files parse successfully.


## 2026-10-23 — Require an active thread before sending chat messages
- Tightened the send-message precondition: a connected/stale send button can no longer submit unless the user is authenticated and the current screen still has an active offer thread. Existing in-flight protection remains in place.
- Updated the regression assertion for the complete send guard.


## 2026-10-23 — Verify all packaged Android launcher icons
- Added static checks for all 15 launcher icon assets across the five Android density folders, including PNG file signatures. This catches missing or misnamed icon files before the PowerShell installer copies them.

## 2026-10-23 — Isolate trip-feed refreshes across account changes
- Found that the trip-feed sequence guard handled out-of-order refreshes, but did not independently capture the account ID. If a refresh was still in flight while the user opened authentication or logged out, its response could potentially finish under a different session and affect the new screen.
- Each reload now captures the starting user ID, scopes passenger/driver booking queries to that ID, and checks both request sequence and account identity before rendering or displaying an error. Opening authentication and logging out invalidate pending feed requests and reset the booking-change snapshot.
- Added regression assertions for account scoping, stale result/error suppression, and auth/logout invalidation. `node --check www/online.js`, `node --check www/app.js`, `node tests/static-check.mjs`, and `git diff --check` pass. This is client-side lifecycle protection; live two-account and real-device testing remain pending.

## 2026-10-23 — Prevent auth retries from crossing account boundaries
- Hardened the shared authenticated request helper: it captures the account ID that initiated a request and will only refresh/retry an expired-token request if the same account is still active, checking again after token refresh.
- This complements the trip-feed lifecycle guard and prevents a delayed 401 from one account from being retried with another account's current credentials after a logout/login transition.
- Added a static regression assertion. `node --check www/online.js`, `node --check www/app.js`, `node tests/static-check.mjs`, and `git diff --check` pass. This does not replace server-side RLS and needs real multi-account testing.


## 2026-10-23 — Keep delayed token refreshes inside the original session
- Hardened refreshSession against overlapping refresh requests and account transitions. It now captures the initiating user and refresh token, ignores late responses after an account switch, and does not clear a newer session when an old refresh fails. If another refresh for the same account has already rotated the token, the late request preserves that newer session rather than overwriting it.
- Added a static regression assertion. This reduces client-side session races but does not replace Supabase Auth/RLS configuration or real multi-account testing.


## 2026-10-23 — Stop stale trip refreshes between query stages
- Added a lifecycle check immediately after passenger/driver booking queries complete. If the user changed account or left the trip screen while those queries were pending, the old refresh now stops before issuing the occupied-seat RPC with whatever session is currently active. The existing later check still protects rendering.
- Added a regression assertion. This avoids unnecessary cross-session follow-up requests and reduces stale-work races; database RLS remains the security boundary.

## 2026-10-23 — Prevent stale community inbox loads
- Added a monotonically increasing request sequence and account/screen checks to the standalone community inbox loader. A slow response can no longer paint old-account offers into a newly opened inbox, and stale errors no longer replace the current inbox message.
- Logging out invalidates any in-flight inbox-list request.
- Added static regression checks for the account/screen guard and logout invalidation. `node --check www/online.js`, `node --check www/app.js`, `node tests/static-check.mjs`, and `git diff --check` pass. This is client-side stale-response protection; server-side RLS and two-account device tests remain outstanding.


## 2026-10-24 — Everyday-use services hub
- Expanded the Services home with three independent utilities aimed at people who own cars or travel occasionally, not only intercity taxi users: roadside-help request composer, trip planner, and a local car profile/reminder view.
- Roadside-help flow allows optional one-tap GPS coordinates after explicit user action and prepares a shareable request for the user's chosen contact/service. It explicitly states that Pitak Go is not yet connected to live towing/mechanic dispatch and does not claim that help is on the way.
- Trip planner stores route/date/return date/passenger count/notes in localStorage on the current device and can share the plan. It is explicitly not a booking or a live fare/availability estimate.
- Car profile stores model, optional plate, service date, insurance date and notes locally; dates are shown as reminders when the user opens this screen. No cloud sync or scheduled notification is claimed.
- Updated app subtitle and added static regression checks for the three utility entry points, explicit geolocation action, local persistence and the no-live-dispatch disclosure.
- Validation: `node --check www/online.js`, `node --check www/app.js`, `node tests/static-check.mjs`, and `git diff --check`. Real Android/device testing and live provider integrations remain outstanding.

## 2026-10-24 — Everyday utility validation hardening
- Reconstructed the current cumulative working tree from the verified 2026-10-24 backup before continuing; created a local Git baseline commit so subsequent edits are tracked.
- Added strict local-calendar date parsing for trip plans and vehicle reminders, including impossible dates (for example, 31 February).
- Trip plans reject past departure/return dates, reject return-before-departure, and update the return-date picker minimum when departure changes. The checks run for both save and share.
- Local storage write failures now surface a user-facing error instead of silently pretending data was saved.
- Vehicle reminder day counts use UTC calendar-day arithmetic to avoid daylight-saving and local-time rounding errors.
- Roadside GPS messages now include a clickable Google Maps query link built from the coordinates returned by the device. Location is still requested only after the user's explicit tap; no dispatch is claimed.
- Added static regression checks for these behaviours. JavaScript syntax and static checks passed; no real-device or live-service test is claimed.

## 2026-10-24 — Guard roadside GPS callbacks and preserve overdue reminders
- Roadside GPS callbacks now verify that the original location field and button are still attached and active before updating the UI. A delayed geolocation result cannot unexpectedly overwrite a newly opened roadside-help form after navigation.
- Vehicle maintenance and insurance dates now allow a valid past date, so an expired insurance date or overdue service can be saved and clearly shown as overdue. Impossible/malformed calendar dates are still rejected.
- Added static regression checks for both cases. Validation: `node --check www/online.js`, `node --check www/app.js`, `node tests/static-check.mjs`, and `git diff --check` pass. These are static checks, not real-device tests.

## 2026-10-24 — Scope community service-feed responses to the active screen and account
- Added a monotonically increasing request sequence to the community service-post feed. Each load captures the initiating user and service screen; responses render only if the same request is still current, the same list element remains attached, and the user is still viewing Services.
- Stale errors are also ignored instead of replacing the active screen with an unrelated failure message. This is client-side display protection; database RLS remains the access-control boundary.
- Added regression assertions. `node --check www/online.js`, `node --check www/app.js`, `node tests/static-check.mjs`, and `git diff --check` pass. Real multi-account/device testing is still required.

## 2026-10-24 — Community service and messaging stale-response hardening
- Community service replies now capture the starting account, feed element, and screen; stale replies/errors cannot paint a later account or an old detached card.
- Community offer submission now requires the active visible form, captures the author ID before sending, and avoids success/error notices or refreshes after navigation/account changes. Duplicate submissions remain blocked.
- Seat-map availability requests are scoped to the same active account/feed/post form before updating the UI.
- Service publication captures the selected service kind and starting account, rejects stale forms, and only switches screens or reports success while that same form/account remains active.
- The requested date/time input now starts at the next local minute to avoid allowing the current minute in the picker only to reject it during submit validation.
- Community thread loads and sends are now scoped to the exact account, offer, screen, and work panel. Logout invalidates pending thread/reply loads.
- Added static regression assertions for the new protections. `node --check www/online.js`, `node --check www/app.js`, `node tests/static-check.mjs`, and `git diff --check` pass.
- Live Supabase schema inspection is still permission-blocked; no production database changes were made. The pitak catalog remains explicitly preliminary (13 unverified entries, no confirmed coordinates), so the future full-catalog project must collect and verify real stands rather than fabricate locations.

## 2026-10-26 — Scope community decision/withdrawal/cancellation feedback to its initiating thread
- Accept/reject, withdraw-offer, and cancel-community-booking handlers now capture the initiating account, offer, thread screen, and work panel before the request. They refuse to start if the supplied offer is not the active thread and ignore stale success/error feedback after navigation or account changes.
- Action buttons are disabled while their request is pending and restored when still attached. This does not replace server-side authorization/RLS and does not claim a live multi-account booking test.
- Added regression assertions for the active-thread/account guards. Validation: syntax checks, static regression suite, release audit, and whitespace diff checks are run before packaging.

## 2026-10-26 — Final client-side stale-response pass before pitak catalog work
- Rechecked the cumulative QA archive from a fresh extraction. JavaScript syntax, the 106-function static regression suite, and the release audit all pass.
- Hardened service-post close/delete actions to capture the initiating user, service screen, and feed element; stale success/error responses are ignored after account or screen changes. The request uses the captured user ID rather than reading the session after the request starts.
- Hardened the agreed-rides section to capture the initiating user and current bookings/feed panel, so late responses from an earlier account cannot repaint the current screen.
- Added static regression assertions for these guards. `node --check www/online.js`, `node --check www/app.js`, `node tests/static-check.mjs`, and `node tests/release-audit.mjs` pass.
- Release limitation remains: headless Chromium timed out in this environment, no Android project/build or physical-device interaction test is available in this extracted source, and no two-account live server test was performed. This pass improves client-side race safety; it does not certify the app as 100% production-ready or server-secure.
- Ready to shift the next development phase to the Uzbekistan pitak catalog, beginning with a verified source-of-truth dataset and duplicate/location validation before any production database import.


## 2026-10-26 — Pitak catalog research seed v0.1.0

- Added `data/pitaks_catalog.csv` and `.json`, source notes, and data dictionary.
- Seed contains 16 official bus-station records from the Ministry of Transport public list plus 2 open-source informal-pitak leads (Vodiй/Kuylyuk and North Station) without fabricated GPS coordinates.
- Official stations are explicitly not treated as confirmed informal shared-taxi stands. Suspicious coordinates are flagged for verification.
- Source: https://mintrans.uz/ru/avtovokzal-va-avtostantsiyalar-boyicha-malumot; open Telegram channel search page: https://t.me/s/potrebitel_uz?after=8609

## 2026-10-28 — Active pitak research pass
- Reviewed public Yandex Maps taxi-rank listings and public transport guides.
- Added five sourced records to `data/pitak_research_leads.json`: Tashkent–Fergana rank at Toyona 12; Tashkent–Khorezm rank in Beshqurghon mahalla; Angren Hamkor Taxi; the new Samarkand terminal's separately reported shared-taxi waiting area; and the reported Sharq stand near Bukhara airport.
- Added `data/web_map_source_inventory.csv` with eight source records and limitations.
- Coordinates remain null when sources do not expose a precise pickup pin. The Angren listing is not yet classed as intercity; Samarkand's published regional bus routes are not misrepresented as taxi routes.
- Validation: JavaScript syntax, static checks (106 functions), and release audit pass. Research-data validation must tolerate intentionally blank coordinates on the two existing unpinned leads; no unverified point is being promoted to map-ready.

## 2026-10-28 — Active pitak research batch 2 (regional + international)
- Expanded `data/pitak_research_leads.json` from 17 to 36 records (+19 leads) and bumped dataset version to 0.4.0.
- Added regional leads surfaced by a public taxi-stand directory: 77 Pitak (Margilan), Taksi Payaryk (Samarkand), Shakhrisabz Station, Qorajiyda Bekati, Solijonobod Bekati, Oktosh stop, Toshkent Petak, Bekobod Stoyanka, Akhsi, Chust stop, Chiroqchi Stoyanka, Qarshi Taxi Stand 001, a named intercity taxi stand in Kungrad, and Stoyanka Mezhgortaksistov in Urgench.
- Added international-route leads: Kaftarxona for Jartepa/Panjakent, Qo‘yliq to Oybek/Khujand, taxi waiting area on the Uzbek side of Oybek, Bekobod to Qushtегirmon crossing, and a historical Kungrad–Daut-Ota/Beyneu lead explicitly excluded until current passenger-crossing status is verified.
- Added five source entries to `data/web_map_source_inventory.csv` (now 13). Added `data/PITAK_RESEARCH_BATCH_2026-10-28.md` describing evidence and limitations.
- Important quality control: the third-party directory contains short codes, uncertain city associations, and likely geography errors; these were preserved only as leads. Coordinates are null, and no lead was promoted to a map-ready point without a trustworthy exact pin. International border approaches are not assumed to be official taxi stands.
- Data validation: JSON parses; all 36 lead IDs unique; source inventory has 13 unique source IDs. No production Supabase writes performed.
