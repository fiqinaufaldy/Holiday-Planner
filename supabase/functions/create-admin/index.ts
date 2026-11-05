import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ success:false, error:"Unauthorized." },401);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ success:false, error:"Supabase server configuration tidak lengkap." },500);

    const admin = createClient(url, serviceKey, { auth:{ persistSession:false } });
    const token = authHeader.replace("Bearer ","").trim();
    const { data: callerData, error: callerError } = await admin.auth.getUser(token);
    if (callerError || !callerData?.user) return json({ success:false, error:"Session tidak valid." },401);

    const { data: callerProfile, error: profileError } = await admin
      .from("profiles").select("role,is_active").eq("id",callerData.user.id).single();
    if (profileError || callerProfile?.role !== "master" || !callerProfile?.is_active) {
      return json({ success:false, error:"Hanya Master yang dapat membuat Admin." },403);
    }

    const { display_name, pin, trip_ids=[] } = await req.json();
    if (!display_name || !/^[0-9]{6}$/.test(String(pin))) {
      return json({ success:false, error:"Nama dan PIN 6 digit wajib diisi." },400);
    }
    if (!Array.isArray(trip_ids) || !trip_ids.length) {
      return json({ success:false, error:"Pilih minimal satu trip." },400);
    }

    const internalEmail = `admin-${crypto.randomUUID()}@holidayplanner.local`;
    const { data:userData, error:userError } = await admin.auth.admin.createUser({
      email: internalEmail,
      email_confirm: true,
      user_metadata: { display_name, app_role:"admin" },
    });
    if (userError || !userData?.user) return json({ success:false, error:userError?.message||"Gagal membuat user." },400);

    const userId=userData.user.id;
    const pinHash=await bcrypt.hash(String(pin),10);

    const { error:profileCreateError } = await admin.rpc("create_admin_profile", {
      p_user_id:userId, p_display_name:String(display_name).trim(), p_pin_hash:pinHash
    });
    if (profileCreateError) {
      await admin.auth.admin.deleteUser(userId);
      return json({ success:false, error:profileCreateError.message },400);
    }

    const accessRows=trip_ids.map(trip_id=>({ user_id:userId, trip_id, access_role:"admin" }));
    const { error:accessError } = await admin.from("trip_access").insert(accessRows);
    if (accessError) {
      await admin.auth.admin.deleteUser(userId);
      return json({ success:false, error:accessError.message },400);
    }

    return json({ success:true, user_id:userId, display_name:String(display_name).trim(), role:"admin", trip_count:trip_ids.length });
  } catch (error) {
    console.error("create-admin error:",error);
    return json({ success:false, error:error?.message||"Terjadi kesalahan." },500);
  }
});
