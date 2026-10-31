# Backend SQL files — IMPORTANT

The SQL files in this folder are historical prototype/reference material. They do **not** describe the live PitakGo schema used by `www/online.js`.

- `schema.sql` uses the older `rides` / `reservations` model.
- `02_booking_rpc.sql` adds RPCs for that older model.
- The current client uses `trips`, `bookings`, `driver_profiles`, `vehicles`, `driver_pitaks`, `community_posts`, `community_offers`, and RPCs such as `publish_trip`, `reserve_seat`, `driver_booking_decision`, and `my_community_inbox_v3`.

**Do not run the old SQL files against the live Supabase project as an app update.** They would not implement the current app's schema and could create confusing parallel objects. No production database changes were made during this development pass. The available Supabase management connection did not grant permission to inspect the live schema, so the current RPC contracts must be verified through an authorized read-only project connection before any backend change.
