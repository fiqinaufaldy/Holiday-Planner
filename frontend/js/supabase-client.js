/* Holiday Planner v4.2 — Supabase PIN login bridge (Master phase). */
(function () {
 const config=window.HOLIDAY_PLANNER_SUPABASE_CONFIG||{};
 const valid=/^https:\/\//.test(config.url||"") && /^sb_publishable_/.test(config.publishableKey||"");
 if(!valid||!window.supabase?.createClient){
  console.warn("Holiday Planner: Supabase config/SDK is not ready.");
  window.HolidayPlannerCloud={configured:false}; return;
 }
 const client=window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const fail=e=>{if(e)throw new Error(e.message||String(e));};
 const requireSession=async()=>{const {data,error}=await client.auth.getSession();fail(error);if(!data.session)throw new Error("Belum login ke Supabase.");return data.session;};
 const api={configured:true,client,
  async testConnection(){const {error}=await client.from("profiles").select("id").limit(1);if(error)return{ok:false,message:error.message,code:error.code};return{ok:true,message:"Supabase API reachable."};},
  async loginWithPin(pin){
   if(typeof pin!=="string"||!/^\d{6}$/.test(pin))throw new Error("PIN harus 6 digit.");
   const {data,error}=await client.functions.invoke("pin-login",{body:{pin}});
   fail(error);
   if(!data?.success||!data?.session?.access_token||!data?.session?.refresh_token)throw new Error(data?.error||"Login PIN gagal.");
   const {data:sessionData,error:sessionError}=await client.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token});
   fail(sessionError);
   const {data:profile,error:profileError}=await client.from("profiles").select("id,display_name,role,is_active").eq("id",data.user.id).single();
   fail(profileError);
   if(!profile?.is_active)throw new Error("Akun tidak aktif.");
   return {session:sessionData.session,user:data.user,profile};
  },
  async signOut(){const {error}=await client.auth.signOut();fail(error);return{ok:true};},
  async getSession(){const {data,error}=await client.auth.getSession();fail(error);return data.session;},
  async getMyProfile(){await requireSession();const {data,error}=await client.from("profiles").select("id,display_name,role,is_active").single();fail(error);return data;},
  async listTrips(){
   const session=await requireSession();
   const {data:profile,error:profileError}=await client.from("profiles").select("role").eq("id",session.user.id).single();
   fail(profileError);
   let query=client.from("trips").select("id,name,destination,start_date,end_date,description,cover_image_url,status,created_by,created_at,updated_at").order("created_at",{ascending:false});
   if(profile?.role==="admin"){
    const {data:access,error:accessError}=await client.from("trip_access").select("trip_id").eq("user_id",session.user.id).eq("access_role","admin");
    fail(accessError);
    const ids=(access||[]).map(x=>x.trip_id);
    if(!ids.length)return[];
    query=query.in("id",ids);
   }
   const {data,error}=await query;
   fail(error);
   return data||[];
  },
  async loadTripWorkspace(tripId){await requireSession();const {data,error}=await client.from("trip_workspaces").select("payload,updated_at").eq("trip_id",tripId).maybeSingle();fail(error);return data?.payload||null;},
  async saveTripWorkspace(tripId,payload){await requireSession();const {data,error}=await client.from("trip_workspaces").upsert({trip_id:tripId,payload,updated_at:new Date().toISOString()},{onConflict:"trip_id"}).select("trip_id,updated_at").single();fail(error);return data;},
  async createTrip(t){
   await requireSession();
   const payload={name:String(t.name||"").trim(),destination:t.destination||null,start_date:t.start||t.start_date||null,end_date:t.end||t.end_date||null,description:t.description||null,cover_image_url:t.cover||t.cover_image_url||null,status:t.status||"planning"};
   if(!payload.name)throw new Error("Nama trip wajib diisi.");
   const {data,error}=await client.from("trips").insert(payload).select().single();fail(error);
   if(t.pin!==null&&t.pin!==undefined&&t.pin!==""){
    if(typeof t.pin!=="string"||!/\d{6}/.test(t.pin))throw new Error("Trip PIN harus 6 digit.");
    const {error:pinError}=await client.rpc("set_trip_pin",{p_trip_id:data.id,p_pin:t.pin});
    fail(pinError);
   }
   return data;
  },
  async updateTrip(id,t){
   await requireSession();
   const payload={name:String(t.name||"").trim(),destination:t.destination||null,start_date:t.start||t.start_date||null,end_date:t.end||t.end_date||null,description:t.description||null,cover_image_url:t.cover||t.cover_image_url||null,status:t.status||"planning"};
   const {data,error}=await client.from("trips").update(payload).eq("id",id).select().single();fail(error);
   if(t.pin!==null&&t.pin!==undefined&&t.pin!==""){
    if(typeof t.pin!=="string"||!/\d{6}/.test(t.pin))throw new Error("Trip PIN harus 6 digit.");
    const {error:pinError}=await client.rpc("set_trip_pin",{p_trip_id:id,p_pin:t.pin});
    fail(pinError);
   }
   return data;
  },
  async deleteTrip(id){await requireSession();const {error}=await client.from("trips").delete().eq("id",id);fail(error);return{ok:true};},
  async listTripAccess(id){await requireSession();const {data,error}=await client.from("trip_access").select("id,trip_id,user_id,access_role,created_at,profiles(display_name,role,is_active)").eq("trip_id",id).order("created_at");fail(error);return data||[];},
  async listProfiles(){await requireSession();const {data,error}=await client.from("profiles").select("id,display_name,role,is_active,created_at").order("display_name");fail(error);return data||[];},
  async createAdmin(displayName,pin,tripIds){
   await requireSession();
   const {data,error}=await client.functions.invoke("create-admin",{body:{display_name:displayName,pin:String(pin),trip_ids:Array.isArray(tripIds)?tripIds:[]}});
   fail(error);
   if(!data?.success)throw new Error(data?.error||"Gagal membuat Admin.");
   return data;
  },
  async grantTripAccess(tripId,userId,role){await requireSession();if(!["admin","member"].includes(role))throw new Error("Role akses harus admin atau member.");const {data,error}=await client.from("trip_access").upsert({trip_id:tripId,user_id:userId,access_role:role},{onConflict:"trip_id,user_id"}).select().single();fail(error);return data;},
  async revokeTripAccess(id){await requireSession();const {error}=await client.from("trip_access").delete().eq("id",id);fail(error);return{ok:true};}
 };
 window.HolidayPlannerCloud=api;
 console.info("Holiday Planner: Supabase PIN login bridge initialized.");
})();
