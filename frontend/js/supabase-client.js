/* Holiday Planner v4.1 — Supabase Auth + Trips & Access data layer.
 * Browser-safe: uses only the Supabase publishable key. RLS remains authoritative.
 * PIN login is intentionally NOT implemented here; it requires a trusted server endpoint.
 */
(function () {
  const config = window.HOLIDAY_PLANNER_SUPABASE_CONFIG || {};
  const valid = /^https:\/\//.test(config.url || "") && /^sb_publishable_/.test(config.publishableKey || "");
  if (!valid || !window.supabase || !window.supabase.createClient) {
    console.warn("Holiday Planner: Supabase config/SDK is not ready.");
    window.HolidayPlannerCloud = { configured:false, client:null, async testConnection(){return {ok:false,message:"Supabase config or SDK unavailable."};} };
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
  });
  const fail = (error) => { if (error) throw new Error(error.message || String(error)); };
  const requireSession = async () => {
    const { data, error } = await client.auth.getSession(); fail(error);
    if (!data.session) throw new Error("Belum login ke Supabase Auth. Login terlebih dahulu.");
    return data.session;
  };

  const api = {
    configured:true,
    client,
    async testConnection(){
      const { error } = await client.from("profiles").select("id").limit(1);
      if (error) return {ok:false,message:error.message,code:error.code};
      return {ok:true,message:"Supabase API reachable. Login session and RLS are required for protected data."};
    },
    async signIn(email,password){
      const {data,error}=await client.auth.signInWithPassword({email:String(email||"").trim(),password:String(password||"")});
      fail(error);
      const profile=await this.getMyProfile();
      return {session:data.session,user:data.user,profile};
    },
    async signOut(){const {error}=await client.auth.signOut();fail(error);return {ok:true};},
    async getSession(){const {data,error}=await client.auth.getSession();fail(error);return data.session;},
    async getMyProfile(){
      await requireSession();
      const {data,error}=await client.from("profiles").select("id,display_name,role,is_active").single();
      fail(error); return data;
    },
    async listTrips(){
      await requireSession();
      const {data,error}=await client.from("trips").select("id,name,destination,start_date,end_date,description,cover_image_url,status,created_by,created_at,updated_at").order("created_at",{ascending:false});
      fail(error); return data||[];
    },
    async createTrip(trip){
      await requireSession();
      const payload={name:String(trip.name||"").trim(),destination:trip.destination||null,start_date:trip.start||trip.start_date||null,end_date:trip.end||trip.end_date||null,description:trip.description||null,cover_image_url:trip.cover||trip.cover_image_url||null,status:trip.status||"planning"};
      if(!payload.name) throw new Error("Nama trip wajib diisi.");
      const {data,error}=await client.from("trips").insert(payload).select().single();fail(error);return data;
    },
    async updateTrip(id,trip){
      await requireSession();
      const payload={name:String(trip.name||"").trim(),destination:trip.destination||null,start_date:trip.start||trip.start_date||null,end_date:trip.end||trip.end_date||null,description:trip.description||null,cover_image_url:trip.cover||trip.cover_image_url||null,status:trip.status||"planning"};
      const {data,error}=await client.from("trips").update(payload).eq("id",id).select().single();fail(error);return data;
    },
    async deleteTrip(id){
      await requireSession();const {error}=await client.from("trips").delete().eq("id",id);fail(error);return {ok:true};
    },
    async listTripAccess(tripId){
      await requireSession();
      const {data,error}=await client.from("trip_access").select("id,trip_id,user_id,access_role,created_at,profiles(display_name,role,is_active)").eq("trip_id",tripId).order("created_at");
      fail(error);return data||[];
    },
    async listProfiles(){
      await requireSession();
      const {data,error}=await client.from("profiles").select("id,display_name,role,is_active,created_at").order("display_name");
      fail(error);return data||[];
    },
    async grantTripAccess(tripId,userId,role){
      await requireSession();
      if(!["admin","member"].includes(role))throw new Error("Role akses harus admin atau member.");
      const {data,error}=await client.from("trip_access").upsert({trip_id:tripId,user_id:userId,access_role:role},{onConflict:"trip_id,user_id"}).select().single();
      fail(error);return data;
    },
    async revokeTripAccess(accessId){
      await requireSession();const {error}=await client.from("trip_access").delete().eq("id",accessId);fail(error);return {ok:true};
    }
  };
  window.HolidayPlannerCloud=api;
  console.info("Holiday Planner: Supabase client and Trips/Access data layer initialized.");
})();
