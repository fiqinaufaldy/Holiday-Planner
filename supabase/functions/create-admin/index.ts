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

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

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

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    // 1. Trip PIN has priority. The PIN entered in Create New Trip
    //    is the single PIN used by Members to enter that trip.
    const { data: tripResult, error: tripError } = await admin.rpc(
      "verify_trip_pin",
      { p_pin: pin },
    );

    if (tripError) {
      console.error("verify_trip_pin error:", tripError);
      return json({ error: "PIN trip tidak dapat diverifikasi" }, 500);
    }

    if (tripResult && tripResult.length > 0) {
      const tripId = tripResult[0].trip_id;

      const { data: trip, error: tripLoadError } = await admin
        .from("trips")
        .select("id,name,status")
        .eq("id", tripId)
        .single();

      if (tripLoadError || !trip) {
        console.error("trip lookup error:", tripLoadError);
        return json({ error: "Trip tidak ditemukan" }, 404);
      }

      // Reuse an existing Member assigned to this trip if one exists.
      let { data: memberAccess, error: accessError } = await admin
        .from("trip_access")
        .select("user_id")
        .eq("trip_id", tripId)
        .eq("access_role", "member")
        .limit(1)
        .maybeSingle();

      if (accessError) {
        console.error("member access lookup error:", accessError);
        return json({ error: "Akses Member tidak dapat diperiksa" }, 500);
      }

      let userId = memberAccess?.user_id;

      // A trip can use its PIN even if no Member profile was created yet.
      // Create the internal Auth user on first successful Trip PIN login.
      if (!userId) {
        const internalEmail = `member-${tripId}@holidayplanner.local`;
        const { data: userData, error: userError } =
          await admin.auth.admin.createUser({
            email: internalEmail,
            email_confirm: true,
            user_metadata: {
              display_name: `${trip.name} Member`,
              app_role: "member",
              trip_id: tripId,
            },
          });

        if (userError || !userData?.user) {
          console.error("member create error:", userError);
          return json(
            { error: userError?.message || "Gagal membuat akun Member" },
            500,
          );
        }

        userId = userData.user.id;

        const { error: accessInsertError } = await admin
          .from("trip_access")
          .insert({
            trip_id: tripId,
            user_id: userId,
            access_role: "member",
          });

        if (accessInsertError) {
          await admin.auth.admin.deleteUser(userId);
          console.error("member access create error:", accessInsertError);
          return json(
            { error: "Gagal menghubungkan Member ke trip" },
            500,
          );
        }
      }

      const { data: userData, error: userError } =
        await admin.auth.admin.getUserById(userId);

      if (userError || !userData?.user?.email) {
        console.error("getUserById error:", userError);
        return json({ error: "Akun Member tidak ditemukan" }, 500);
      }

      const email = userData.user.email;

      const { data: linkData, error: linkError } =
        await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
        });

      if (linkError) {
        console.error("generateLink error:", linkError);
        return json({ error: "Gagal membuat sesi login Member" }, 500);
      }

      const tokenHash = linkData.properties?.hashed_token;
      if (!tokenHash) {
        return json({ error: "Token sesi tidak tersedia" }, 500);
      }

      const authClient = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { data: authData, error: authError } =
        await authClient.auth.verifyOtp({
          type: "magiclink",
          token_hash: tokenHash,
        });

      if (authError || !authData.session) {
        console.error("verifyOtp error:", authError);
        return json({ error: "Gagal menerbitkan sesi Member" }, 500);
      }

      return json({
        success: true,
        role: "member",
        trip_id: tripId,
        session: authData.session,
        user: authData.user,
      });
    }

    // 2. Preserve the existing Master/Admin/legacy Member PIN flow.
    const { data: profileResult, error: profilePinError } =
      await admin.rpc("verify_pin", { p_pin: pin });

    if (profilePinError) {
      console.error("verify_pin error:", profilePinError);
      return json({ error: "PIN tidak dapat diverifikasi" }, 500);
    }

    if (!profileResult || profileResult.length === 0) {
      return json({ error: "PIN salah atau akses sementara dibatasi" }, 401);
    }

    const userId = profileResult[0].user_id;
    const appRole = profileResult[0].app_role;

    const { data: userData, error: userError } =
      await admin.auth.admin.getUserById(userId);

    if (userError || !userData?.user?.email) {
      console.error("getUserById error:", userError);
      return json({ error: "Akun pengguna tidak ditemukan" }, 500);
    }

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email: userData.user.email,
      });

    if (linkError) {
      console.error("generateLink error:", linkError);
      return json({ error: "Gagal membuat sesi login" }, 500);
    }

    const tokenHash = linkData.properties?.hashed_token;
    if (!tokenHash) {
      return json({ error: "Token sesi tidak tersedia" }, 500);
    }

    const authClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authData, error: authError } =
      await authClient.auth.verifyOtp({
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
      trip_id: profileResult[0].trip_id || null,
      session: authData.session,
      user: authData.user,
    });
  } catch (error) {
    console.error("pin-login error:", error);
    return json(
      { error: "Permintaan login tidak dapat diproses" },
      400,
    );
  }
});
