/* Supabase connection foundation for Holiday Planner v4.0.
 * Existing v3.9 LocalStorage behavior is intentionally left intact until
 * PIN authentication and row-to-UI data mapping are completed.
 */
(function () {
  const config = window.HOLIDAY_PLANNER_SUPABASE_CONFIG || {};
  const valid = /^https:\/\//.test(config.url || "") &&
    /^sb_publishable_/.test(config.publishableKey || "");
  if (!valid || !window.supabase || !window.supabase.createClient) {
    console.warn("Holiday Planner: Supabase config/SDK is not ready.");
    window.HolidayPlannerCloud = { configured: false, client: null, async testConnection() { return { ok:false, message:"Supabase config or SDK unavailable." }; } };
    return;
  }
  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.HolidayPlannerCloud = {
    configured: true, client,
    async testConnection() {
      const { error } = await client.from("profiles").select("id").limit(1);
      if (error) return { ok:false, message:error.message, code:error.code };
      return { ok:true, message:"Supabase API reachable. Authenticated data access still depends on RLS/session." };
    }
  };
  console.info("Holiday Planner: Supabase client initialized.");
})();
