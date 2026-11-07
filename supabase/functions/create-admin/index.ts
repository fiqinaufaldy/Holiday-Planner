import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const { pin } = await req.json();
    if (typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
      return json({ error: "PIN harus terdiri dari 6 digit" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !anonKey) {
      return json({ error: "Konfigurasi Supabase belum lengkap" }, 500);
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const { data: pinResult, error: pinError } = await admin.rpc("verify_pin", { p_pin: pin });
    if (pinError) {
      console.error("verify_pin error:", pinError);
      return json({ error: "PIN tidak dapat diverifikasi" }, 500);
    }

    if (!pinResult || pinResult.length === 0) {
      return json({ error: "PIN salah atau akses sementara dibatasi" }, 401);
    }

    const userId = pinResult[0].user_id;
    const appRole = pinResult[0].app_role;
    const tripId = pinResult[0].trip_id || null;

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      console.error("getUserById error:", userError);
      return json({ error: "Akun pengguna tidak ditemukan" }, 500);
    }

    const email = userData.user.email;
    if (!email) return json({ error: "Akun belum memiliki email Auth" }, 500);

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError) {
      console.error("generateLink error:", linkError);
      return json({ error: "Gagal membuat sesi login" }, 500);
    }

    const tokenHash = linkData.properties?.hashed_token;
    if (!tokenHash) return json({ error: "Token sesi tidak tersedia" }, 500);

    const authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await authClient.auth.verifyOtp({
      type: "magiclink",
      token_hash: tokenHash,
    });
    if (authError || !authData.session) {
      console.error("verifyOtp error:", authError);
      return json({ error: "Gagal menerbitkan sesi login" }, 500);
    }

    return json({
      success: true,
      role: appRole,
      trip_id: tripId,
      session: authData.session,
      user: authData.user,
    });
  } catch (error) {
    console.error("pin-login error:", error);
    return json({ error: "Permintaan login tidak dapat diproses" }, 400);
  }
});
