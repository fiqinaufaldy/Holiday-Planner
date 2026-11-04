HOLIDAY PLANNER v4.0 — SUPABASE CONNECTION FOUNDATION

This package is based on the existing v3.9 frontend. Existing UI and LocalStorage workflows are retained.

SUPABASE PROJECT
- Project URL is configured in frontend/js/supabase-config.js
- Browser publishable key is configured there. This key is intended for browser use; database safety depends on RLS.
- NEVER place an sb_secret_* or service_role key in frontend files.

WHAT IS INCLUDED
- Supabase JS v2 CDN loader.
- Browser client initialization in frontend/js/supabase-client.js.
- window.HolidayPlannerCloud.client for the next integration phase.
- window.HolidayPlannerCloud.testConnection() for a connection check from browser devtools.

IMPORTANT LIMITATION
This is the connection foundation, NOT the completed cloud migration. The current v3.9 PIN login and app data still use LocalStorage. Do not use it as a multi-user production release yet. PIN authentication must be implemented server-side (e.g. Cloudflare Worker) and data CRUD must then be mapped to the existing Supabase tables with RLS. This avoids exposing PIN hashes or privileged keys in the browser.

TEST
1. Extract the ZIP and serve the frontend over localhost or HTTPS (not file://).
2. Open browser DevTools Console.
3. Run: HolidayPlannerCloud.testConnection()
4. A permission error while signed out is not proof that the project URL is unreachable; it may simply mean RLS correctly blocks anonymous profile reads.

The legacy WordPress plugin is included unchanged for reference only. Do not activate it on the live Fairway Nine WordPress site.
