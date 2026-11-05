import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "Supabase service configuration is missing." }, 500);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Missing authorization token." }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: caller, error: callerError } = await admin.auth.getUser(token);
    if (callerError || !caller.user) return json({ error: "Unauthorized." }, 401);

    const { data: callerProfile, error: profileError } = await admin.from("profiles")
      .select("id,role,is_active").eq("id", caller.user.id).single();
    if (profileError || !callerProfile || callerProfile.role !== "master" || !callerProfile.is_active)
      return json({ error: "Master Access required." }, 403);

    const body = await req.json();
    const name = String(body?.name || "").trim();
    const pin = String(body?.pin || "").trim();
    const tripIds = Array.isArray(body?.tripIds) ? [...new Set(body.tripIds.map(String))] : [];
    if (!name || !/^\d{6}$/.test(pin)) return json({ error: "Nama dan PIN 6 digit wajib diisi." }, 400);
    if (!tripIds.length) return json({ error: "Pilih minimal satu trip." }, 400);

    const { data: pinExists, error: pinCheckError } = await admin.rpc("verify_pin", { p_pin: pin });
    if (pinCheckError) return json({ error: "PIN check failed: " + pinCheckError.message }, 500);
    if (pinExists?.length) return json({ error: "PIN sudah digunakan." }, 409);

    const email = `admin-${crypto.randomUUID()}@holidayplanner.app`;
    const { data: created, error: createUserError } = await admin.auth.admin.createUser({
      email, email_confirm: true, user_metadata: { display_name: name, app_role: "admin" },
    });
    if (createUserError || !created.user) return json({ error: createUserError?.message || "Gagal membuat Auth user." }, 500);

    const userId = created.user.id;
    const { error: profileInsertError } = await admin.rpc("create_admin_profile", {
      p_user_id: userId, p_display_name: name, p_pin: pin,
    });
    if (profileInsertError) {
      await admin.auth.admin.deleteUser(userId);
      return json({ error: "Gagal membuat profile Admin: " + profileInsertError.message }, 500);
    }

    const { data: validTrips, error: tripError } = await admin.from("trips").select("id").in("id", tripIds);
    if (tripError || !(validTrips || []).length) {
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      return json({ error: tripError?.message || "Trip yang dipilih tidak ditemukan di Supabase." }, 400);
    }

    const { error: accessError } = await admin.from("trip_access").insert(
      validTrips.map(t => ({ trip_id: t.id, user_id: userId, access_role: "admin" }))
    );
    if (accessError) {
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      return json({ error: "Gagal memberi trip access: " + accessError.message }, 500);
    }
    return json({ success: true, user_id: userId, name, email, trip_ids: validTrips.map(t => t.id) });
  } catch (error) {
    return json({ error: error?.message || String(error) }, 500);
  }
});
