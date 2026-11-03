PLANNER API 2.1 — INITIAL PIN DATABASE SEED

On plugin activation, if the Planner trip table is empty, it creates these starter records:
- Batu Escape (Batu, Malang, Jawa Timur): Trip PIN 262626
- Bali Getaway (Bali, Indonesia): Trip PIN 000000

Initial Master PIN: 240225.

All PINs are immediately hashed using WordPress password hashing and stored as hashes:
- Master hash: wp_options.planner_admin_pin_hash
- Trip hashes: {prefix}planner_trip_access.pin_hash

The starter trips are seeded only when the trips table is empty. Re-activating the plugin does not overwrite existing PINs or trip records.

Trip PINs can later be changed from Master Access through PUT /wp-json/planner/v1/trips/{id} with {pin:"new six digit pin"}.
Master PIN can be changed at WordPress Admin > Settings > Planner API.

IMPORTANT:
The current HTML/CSS/JS prototype is not yet connected to this API. The database seed is implemented in this backend plugin. Do not assume changing PINs in the browser prototype changes MySQL until API integration is completed.

Before production, implement rate limiting/lockout for PIN attempts, robust CORS OPTIONS/preflight, HTTPS-only access, and a security review.
