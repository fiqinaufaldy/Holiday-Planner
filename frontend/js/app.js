(()=>{
const $=s=>document.querySelector(s), store="hp_multi_trip_v1";
const seed={admin:{name:"Fiqi Naufaldy",pin:"240225"},trips:[
{id:"batuescape",name:"Batu Escape",destination:"Batu, Malang, Jawa Timur",start:"2026-12-12",end:"2026-12-13",pin:"",cover:"https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=85",participants:[{name:"Fiqi",contact:"",role:"Organizer",status:"Confirmed"}],budget:[{category:"Villa",description:"Villa 1 malam",amount:3500000},{category:"Transport",description:"BBM dan tol",amount:1000000},{category:"Food",description:"Makan dan minum",amount:1000000}],cashflow:[{date:"2026-11-01",type:"Expense",description:"DP villa",amount:1000000}],stays:[],destinations:[{name:"Jatim Park 2",area:"Oro-Oro Ombo",cost:150000}],itinerary:[{date:"2026-12-12",time:"09:00",title:"Departure to Batu",place:"Surabaya → Batu",note:"Berangkat bersama"}]},
{id:"bali",name:"Bali Getaway",destination:"Bali, Indonesia",start:"2027-01-15",end:"2027-01-18",pin:"",cover:"https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=85",participants:[],budget:[],cashflow:[],stays:[],destinations:[],itinerary:[]}
]};
let db=load(),mode="",tripId=null,page="All Trips",editingTripId=null,activeAdmin=null,memberName="",pendingTripWelcome=false;
let activePlanId="plan_a";
// Initialize cloud sync state before the first save() call.
let cloudSyncReady=false;
const cloudSaveTimers=new Map();
function ensurePlans(t){
 if(!t.plans){
  t.plans=[
   {id:"plan_a",name:"Plan A",enabled:true,tripInfo:{destination:t.destination||"",start:t.start||"",end:t.end||""},budget:t.budget||[],income:t.income||[],cashflow:t.cashflow||[],stays:t.stays||[],destinations:t.destinations||[],itinerary:t.itinerary||[],budgetLimit:t.budgetLimit||0},
   {id:"plan_b",name:"Plan B",enabled:true,tripInfo:{destination:t.destination||"",start:t.start||"",end:t.end||""},budget:[],income:[],cashflow:[],stays:[],destinations:[],itinerary:[],budgetLimit:0}
  ];
  t.activePlanId="plan_a";
 }
 const oldC=t.plans.find(p=>p.id==="plan_c");
 if(oldC){
  const target=t.plans.find(p=>p.id==="plan_b");
  if(target&&t.activePlanId==="plan_c"){
   ["budget","income","cashflow","stays","destinations","itinerary","budgetLimit"].forEach(k=>target[k]=oldC[k]??target[k]);
   t.activePlanId="plan_b";
  }
  t.plans=t.plans.filter(p=>p.id!=="plan_c");
 }
 ["plan_a","plan_b"].forEach((id,i)=>{
  if(!t.plans.some(p=>p.id===id))t.plans.push({id,name:i?"Plan B":"Plan A",enabled:i===0,budget:[],income:[],cashflow:[],stays:[],destinations:[],itinerary:[],budgetLimit:0});
 });
 t.plans=t.plans.filter(p=>p.id==="plan_a"||p.id==="plan_b");
 t.plans.forEach(p=>{if(!p.tripInfo)p.tripInfo={destination:t.destination||"",start:t.start||"",end:t.end||""};});
 t.plans.forEach(p=>{if(!Array.isArray(p.income))p.income=[];if(!Array.isArray(p.budget))p.budget=[];});
 if(!t.plans.some(p=>p.enabled))t.plans[0].enabled=true;
 if(!t.activePlanId||!t.plans.some(p=>p.id===t.activePlanId&&p.enabled))t.activePlanId=t.plans.find(p=>p.enabled).id;
}
function syncPlan(t){
 ensurePlans(t);
 const p=t.plans.find(x=>x.id===t.activePlanId)||t.plans[0];
 ["budget","income","cashflow","stays","destinations","itinerary","budgetLimit"].forEach(k=>p[k]=t[k]??(k==="budgetLimit"?0:[]));
 p.tripInfo={destination:t.destination||"",start:t.start||"",end:t.end||""};
}
function activatePlan(t,id){
 ensurePlans(t);syncPlan(t);
 const p=t.plans.find(x=>x.id===id&&x.enabled);if(!p)return false;
 t.activePlanId=id;activePlanId=id;
 ["budget","income","cashflow","stays","destinations","itinerary","budgetLimit"].forEach(k=>t[k]=p[k]??(k==="budgetLimit"?0:[]));
 t.destination=p.tripInfo?.destination??t.destination??"";
 t.start=p.tripInfo?.start??t.start??"";
 t.end=p.tripInfo?.end??t.end??"";
 save();return true;
}

let plannerTheme=localStorage.getItem("holidayPlannerTheme")||"dark";
function applyPlannerTheme(){
 document.documentElement.dataset.theme=plannerTheme;
 document.body.dataset.theme=plannerTheme;
 const btn=$("#themeToggle");
 if(btn){const next=plannerTheme==="dark"?"Light mode":"Dark mode";btn.innerHTML=hpIcon(plannerTheme==="dark"?"sun":"moon")+`<span>${next}</span>`;btn.setAttribute("aria-label",plannerTheme==="dark"?"Switch to light mode":"Switch to dark mode");}
}
function togglePlannerTheme(){
 plannerTheme=plannerTheme==="dark"?"light":"dark";
 localStorage.setItem("holidayPlannerTheme",plannerTheme);
 applyPlannerTheme();
}
if(!db.admin) db.admin={name:"Fiqi Naufaldy",pin:"240225"};
if(!db.admin.name || db.admin.name==="Administrator") db.admin.name="Fiqi Naufaldy";
if(!("photo" in db.admin)) db.admin.photo="";
if(!Array.isArray(db.admins)) db.admins=[];
if(!Array.isArray(db.requests)) db.requests=[];
const initialTripPins={"batuescape":"262626"};
db.trips=db.trips.filter(t=>t.id!=="bali");
db.trips.forEach(t=>{if(Object.prototype.hasOwnProperty.call(initialTripPins,t.id) && !t.pin) t.pin=initialTripPins[t.id];});
save();
if(!Array.isArray(db.trips)) db.trips=seed.trips;

function load(){try{return JSON.parse(localStorage.getItem(store))||seed}catch{return seed}}
function queueCloudWorkspaceSave(t){
 if(!cloudSyncReady||!t?.id||!window.HolidayPlannerCloud?.saveTripWorkspace)return;
 const timer=cloudSaveTimers.get(t.id);if(timer)clearTimeout(timer);
 cloudSaveTimers.set(t.id,setTimeout(async()=>{
  try{const snapshot=JSON.parse(JSON.stringify(t));delete snapshot.pin;
   // Keep public.trips card metadata in sync with edits saved in the workspace.
   if(window.HolidayPlannerCloud.updateTrip){
    await window.HolidayPlannerCloud.updateTrip(t.id,{name:t.name,destination:t.destination,start:t.start,end:t.end,cover:t.cover,description:t.description,status:t.status});
   }
   await window.HolidayPlannerCloud.saveTripWorkspace(t.id,snapshot);
   window.dispatchEvent(new CustomEvent("holidayplanner:cloud-saved",{detail:{tripId:t.id}}));
  }catch(error){console.error("Holiday Planner cloud save failed:",error);toast("Gagal menyimpan ke cloud: "+(error.message||"periksa koneksi"));}
  finally{cloudSaveTimers.delete(t.id);}
 },450));
}
function save(){localStorage.setItem(store,JSON.stringify(db));if(cloudSyncReady&&Array.isArray(db.trips))db.trips.forEach(queueCloudWorkspaceSave)}
function money(n){return "Rp "+Number(n||0).toLocaleString("id-ID")}
function date(s){return s?new Date(s+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}):"—"}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(s){let t=$("#toast");t.textContent=s;t.style.display="block";clearTimeout(toast.t);toast.t=setTimeout(()=>t.style.display="none",2200)}

let plannerLanguage=localStorage.getItem("holidayPlannerLanguage")||"en";
const languagePairs=[
["YOUR TRAVEL SPACE","RUANG PERJALANANMU"],["Dashboard","Dasbor"],["General","Umum"],["Participants","Peserta"],
["Income Planning","Rencana Pemasukan"],["Expense Planning","Rencana Pengeluaran"],["Cash Flow","Arus Kas"],
["Villas & Stay","Villa & Penginapan"],["Destinations","Destinasi"],["Itinerary","Jadwal Perjalanan"],
["Assigned Trips","Trip yang Ditugaskan"],["Log out","Keluar"],["Light mode","Mode terang"],["Dark mode","Mode gelap"],
["Continue →","Lanjutkan →"],["Budget Overview","Ringkasan Anggaran"],["Upcoming Itinerary","Jadwal Berikutnya"],
["Trip Information","Informasi Trip"],["Save changes","Simpan perubahan"],["Trip Participants","Peserta Trip"],
["Add Participant","Tambah Peserta"],["Add Destinations","Tambah Destinasi"],["Add Itinerary","Tambah Jadwal"],
["Add income","Tambah pemasukan"],["Add expense","Tambah pengeluaran"],["Planned expenses","Rencana pengeluaran"],
["Income Sources","Sumber pemasukan"],["Expenses","Pengeluaran"],["Payments","Pembayaran"],
["Search villa or location...","Cari villa atau lokasi..."],["Find your perfect stay.","Temukan penginapan yang tepat."],
["Accommodation options","Pilihan akomodasi"],["No description added yet.","Belum ada deskripsi."],
["No facilities listed yet.","Belum ada fasilitas."]
];
languagePairs.push(...[["Your trip workspace", "Ruang perjalananmu"], ["Trip information", "Informasi perjalanan"], ["Trip Information", "Informasi Perjalanan"], ["Your trip schedule", "Jadwal perjalananmu"], ["Places to explore", "Tempat untuk dijelajahi"], ["Accommodation options", "Pilihan akomodasi"], ["Manage everyone joining this trip", "Kelola semua peserta perjalanan ini"], ["Manage every source of trip funding", "Kelola seluruh sumber dana perjalanan"], ["Plan the funds available for this trip.", "Rencanakan dana yang tersedia untuk perjalanan ini."], ["Plan and monitor the expenses for this trip.", "Rencanakan dan pantau pengeluaran perjalanan ini."], ["Track all money received and spent across this trip.", "Pantau seluruh uang masuk dan keluar selama perjalanan ini."], ["Manage places to explore for this trip.", "Kelola tempat yang ingin dikunjungi selama perjalanan ini."], ["Manage your trip schedule in one place.", "Kelola jadwal perjalanan dalam satu tempat."], ["Trip name", "Nama Trip"], ["Destination", "Destinasi"], ["Start date", "Tanggal Mulai"], ["End date", "Tanggal Selesai"], ["Save trip information", "Simpan Informasi Trip"], ["Plan Settings", "Pengaturan Plan"], ["Plan name", "Nama Plan"], ["Default plan", "Plan Default"], ["Save plan settings", "Simpan Pengaturan Plan"], ["Enable Plan A", "Aktifkan Plan A"], ["Enable Plan B", "Aktifkan Plan B"], ["Available", "Tersedia"], ["Disabled", "Nonaktif"], ["Available on Dashboard", "Tersedia di Dasbor"], ["Hidden from Dashboard", "Disembunyikan dari Dasbor"], ["Dashboard", "Dasbor"], ["General", "Umum"], ["Participants", "Peserta"], ["Income Planning", "Perencanaan Pemasukan"], ["Expense Planning", "Perencanaan Pengeluaran"], ["Cash Flow", "Arus Kas"], ["Villas & Stay", "Villa & Penginapan"], ["Destinations", "Destinasi"], ["Itinerary", "Jadwal Perjalanan"], ["Assigned Trips", "Daftar Trip"], ["Log out", "Keluar"], ["Add Participant", "Tambah Peserta"], ["Add Destination", "Tambah Destinasi"], ["Add Destinations", "Tambah Destinasi"], ["Add Itinerary", "Tambah Jadwal"], ["Add Villa", "Tambah Villa"], ["Add income", "Tambah Pemasukan"], ["Add expense", "Tambah Pengeluaran"], ["Add transaction", "Tambah Transaksi"], ["Add item", "Tambah Item"], ["Edit", "Ubah"], ["Delete", "Hapus"], ["Save changes", "Simpan Perubahan"], ["Cancel", "Batal"], ["Save", "Simpan"], ["Name", "Nama"], ["Area", "Area"], ["Notes", "Catatan"], ["Actions", "Aksi"], ["Action", "Aksi"], ["Status", "Status"], ["Role", "Peran"], ["Date", "Tanggal"], ["Time", "Waktu"], ["Activity", "Aktivitas"], ["Location", "Lokasi"], ["Description", "Deskripsi"], ["Amount", "Nominal"], ["Category", "Kategori"], ["Contact", "Kontak"], ["Planned expenses", "Rencana Pengeluaran"], ["Income Sources", "Sumber Pemasukan"], ["Expenses", "Pengeluaran"], ["Payments", "Pembayaran"], ["Search villa or location...", "Cari villa atau lokasi..."], ["Find your perfect stay.", "Temukan penginapan yang tepat."], ["No description added yet.", "Belum ada deskripsi."], ["No facilities listed yet.", "Belum ada fasilitas."], ["TRIP BUDGET", "ANGGARAN TRIP"], ["ALLOCATED", "DIALOKASIKAN"], ["PAID", "SUDAH DIBAYAR"], ["OUTSTANDING", "BELUM DIBAYAR"], ["BUDGET HEALTH", "KONDISI ANGGARAN"], ["PLANNED INCOME", "RENCANA PEMASUKAN"], ["RECEIVED", "SUDAH DITERIMA"], ["AWAITING", "MENUNGGU"], ["Total Income", "Total Pemasukan"], ["Total Expense", "Total Pengeluaran"], ["Net Cash Flow", "Arus Kas Bersih"], ["Total Spent", "Total Pengeluaran"], ["Remaining", "Sisa Anggaran"], ["Planned Budget", "Rencana Anggaran"], ["Budget Overview", "Ringkasan Anggaran"], ["Upcoming Itinerary", "Jadwal Berikutnya"], ["Trip Overview", "Ringkasan Trip"], ["Trip Participants", "Peserta Trip"], ["Properties", "Properti"], ["Total Villas", "Total Villa"], ["Booked", "Dipesan"], ["Shortlisted", "Favorit"], ["All properties", "Semua Properti"], ["Your stay collection starts here.", "Koleksi penginapanmu dimulai di sini."], ["No itinerary added yet.", "Belum ada jadwal perjalanan."], ["No transactions recorded yet.", "Belum ada transaksi."], ["No destinations added yet.", "Belum ada destinasi."], ["No income sources yet. Add your first source of funds.", "Belum ada sumber pemasukan. Tambahkan sumber dana pertamamu."], ["Enter your trip", "Masuk ke Trip"], ["A new journey begins", "Perjalanan baru dimulai"], ["Your trip workspace is ready.", "Ruang perjalananmu siap digunakan."], ["Switch to Indonesian", "Ganti ke Bahasa Indonesia"], ["Switch to English", "Ganti ke Bahasa Inggris"], ["Income marked as Received in Income Planning appears here automatically.", "Pemasukan yang ditandai Sudah Diterima di Perencanaan Pemasukan akan otomatis muncul di sini."], ["Track your trip expenses and payments.", "Pantau pengeluaran dan pembayaran perjalananmu."], ["Plan the funds available for this trip.", "Rencanakan dana yang tersedia untuk perjalanan ini."], ["No participants added yet.", "Belum ada peserta."], ["No expenses added yet.", "Belum ada pengeluaran."], ["Planned", "Direncanakan"], ["Received", "Diterima"], ["Pending", "Menunggu"], ["Confirmed", "Dikonfirmasi"], ["Master Access", "Akses Master"], ["Admin Access", "Akses Admin"], ["Member Access", "Akses Anggota"]]);
languagePairs.push(...[["YOUR TRAVEL SPACE", "RUANG PERJALANANMU"], ["Trip workspace", "Ruang trip"], ["Trip name", "Nama Trip"], ["People", "Orang"], ["Guests", "Tamu"], ["Bedrooms", "Kamar Tidur"], ["Bathrooms", "Kamar Mandi"], ["Estimated ticket (Rp)", "Estimasi Tiket (Rp)"], ["Est. ticket (Rp)", "Estimasi Tiket (Rp)"], ["Planned amount (Rp)", "Nominal Rencana (Rp)"], ["Amount (Rp)", "Nominal (Rp)"], ["Income source", "Sumber Pemasukan"], ["Income", "Pemasukan"], ["Expense", "Pengeluaran"], ["Payment", "Pembayaran"], ["Source / Notes", "Sumber / Catatan"], ["Total expected funds", "Total dana yang direncanakan"], ["Funds already received", "Dana yang sudah diterima"], ["Expected but not received", "Dana yang belum diterima"], ["Overall budget limit", "Batas total anggaran"], ["of trip budget", "dari anggaran trip"], ["of allocated", "dari anggaran dialokasikan"], ["not allocated", "belum dialokasikan"], ["On track", "Sesuai rencana"], ["Watch", "Perlu diperhatikan"], ["Over budget", "Melebihi anggaran"], ["Planned expenses", "Rencana Pengeluaran"], ["Manage the costs you expect during your trip.", "Kelola biaya yang diperkirakan selama perjalanan."], ["Plan A", "Plan A"], ["Plan B", "Plan B"], ["Viewing Plan", "Plan yang Dilihat"], ["Trip details", "Detail Trip"], ["Trip Plans", "Pilihan Plan"], ["Plan Details", "Detail Plan"], ["Select the trips this Admin is allowed to manage.", "Pilih trip yang boleh dikelola Admin ini."], ["Create Admin Account", "Buat Akun Admin"], ["Admin Accounts", "Akun Admin"], ["Admin name", "Nama Admin"], ["Admin PIN", "PIN Admin"], ["Trip access", "Akses Trip"], ["Create trip", "Buat Trip"], ["All Trips", "Semua Trip"], ["Create Trip", "Buat Trip"], ["Access Management", "Manajemen Akses"], ["Settings", "Pengaturan"], ["Profile", "Profil"], ["Change PIN", "Ubah PIN"], ["Reference Link", "Tautan Referensi"], ["Overview", "Ringkasan"], ["Facilities", "Fasilitas"], ["Available properties", "Properti tersedia"], ["View details", "Lihat Detail"], ["Add Villa", "Tambah Villa"], ["Owner", "Pemilik"], ["Check-in", "Check-in"], ["Check-out", "Check-out"], ["Price", "Harga"], ["night", "malam"], ["Search", "Cari"], ["Filter", "Saring"], ["All", "Semua"], ["No date", "Belum ada tanggal"], ["No location", "Belum ada lokasi"], ["No notes", "Belum ada catatan"], ["Optional notes", "Catatan opsional"], ["Save Budget", "Simpan Anggaran"], ["Save Income", "Simpan Pemasukan"], ["Edit Budget Item", "Ubah Item Anggaran"], ["Edit Income", "Ubah Pemasukan"], ["Add Budget Item", "Tambah Item Anggaran"], ["Add Income", "Tambah Pemasukan"], ["Budget category", "Kategori Anggaran"], ["Category Plan", "Kategori Plan"], ["No transactions recorded yet.", "Belum ada transaksi yang tercatat."], ["Income marked as Received in Income Planning appears here automatically.", "Pemasukan yang ditandai Sudah Diterima akan otomatis muncul di sini."], ["Enter 6-digit PIN", "Masukkan PIN 6 digit"], ["6 digit PIN", "PIN 6 digit"], ["Continue", "Lanjutkan"], ["Welcome to Holiday Planner", "Selamat Datang di Holiday Planner"], ["Your personal travel space", "Ruang perjalanan pribadimu"], ["Member Access", "Akses Anggota"], ["Admin Access", "Akses Admin"], ["Master Access", "Akses Master"]]);
const plannerOriginalTextNodes = new WeakMap();
const plannerOriginalAttributes = new WeakMap();
function applyPlannerLanguage(){
 const pairs=[...languagePairs].sort((a,b)=>Math.max(b[0].length,b[1].length)-Math.max(a[0].length,a[1].length));
 const replaceText=s=>{let out=s;for(const [en,id] of pairs){const from=plannerLanguage==="id"?en:id,to=plannerLanguage==="id"?id:en;if(!from)continue;const escaped=from.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");out=out.replace(new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`,"gu"),`$1${to}`);}return out;};
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
 while(node=walker.nextNode()){
  const el=node.parentElement;if(!el||el.closest("input,textarea,script,style,code,[contenteditable='true']"))continue;
  if(!plannerOriginalTextNodes.has(node))plannerOriginalTextNodes.set(node,node.nodeValue);
  const original=plannerOriginalTextNodes.get(node);
  if(original.trim())node.nodeValue=replaceText(original);
 }
 document.querySelectorAll("input[placeholder],textarea[placeholder],input[aria-label],button[aria-label],select[aria-label],option").forEach(el=>{
  ["placeholder","aria-label","title"].forEach(attr=>{
   const value=el.getAttribute(attr);if(value===null)return;
   let originals=plannerOriginalAttributes.get(el);
   if(!originals){originals={};plannerOriginalAttributes.set(el,originals);}
   if(!(attr in originals))originals[attr]=value;
   el.setAttribute(attr,replaceText(originals[attr]));
  });
  if(el.tagName==="OPTION"){
   if(!plannerOriginalTextNodes.has(el))plannerOriginalTextNodes.set(el,el.textContent);
   el.textContent=replaceText(plannerOriginalTextNodes.get(el));
  }
 });
 const b=document.querySelector("#languageToggle");if(b){b.textContent=plannerLanguage==="en"?"ID":"EN";b.title=plannerLanguage==="en"?"Ganti ke Bahasa Indonesia":"Switch to English";}
}
function togglePlannerLanguage(){plannerLanguage=plannerLanguage==="en"?"id":"en";localStorage.setItem("holidayPlannerLanguage",plannerLanguage);location.reload();}

function auth(){
 $("#login").classList.remove("hidden");$("#app").classList.add("hidden");
 $("#loginTitle").textContent="Welcome to Holiday Planner";
 $("#loginDesc").textContent="Masukkan PIN untuk melanjutkan.";
 $("#loginHint").textContent="";$("#loginHint").hidden=true;
 $("#pin").value="";$("#pin").setAttribute("autocomplete","new-password");$("#loginError").textContent="";
 const identity=$("#memberIdentity");if(identity)identity.remove();
 $("#pin").focus();
}
async function hydrateTripsFromCloud(){
 if(!window.HolidayPlannerCloud?.listTrips) throw new Error("Supabase Trips API belum tersedia.");
 // Keep an immutable snapshot until cloud sync has definitely succeeded.
 const localSnapshot=Array.isArray(db.trips)?db.trips.map(t=>({...t})):[];
 const map={...(db.cloudTripMap||{})};
 const remote=await window.HolidayPlannerCloud.listTrips();
 let cloudRows=remote.slice();
 const remoteNames=new Set(cloudRows.map(t=>(t.name||"").trim().toLowerCase()));
 const unmappedLocal=localSnapshot.filter(t=>!map[t.id]&&!cloudRows.some(r=>r.id===t.id));
 const candidates=unmappedLocal.filter(t=>!remoteNames.has((t.name||"").trim().toLowerCase()));

 // Supabase is now the primary source of truth.
 // Local-only trips are kept only as a browser fallback/backup and are NOT
 // offered for automatic import during normal login. This prevents the
 // migration popup from appearing on every device/browser that still has
 // an old localStorage snapshot.
 //
 // If a local trip has the same name as a Supabase trip, its local detail
 // snapshot may still be merged below until the cloud workspace is loaded.
 // Trips that exist only in localStorage are intentionally excluded from
 // the active cloud dataset.
 if(candidates.length){
  console.info("Ignoring local-only trips during cloud login:", candidates.map(t=>t.name));
 }

 // Merge cloud rows with local details; never discard local-only records.
 const localById=new Map(localSnapshot.map(t=>[t.id,t]));
 const localByCloudId=new Map(Object.entries(map).map(([localId,cloudId])=>[cloudId,localById.get(localId)]).filter(([,v])=>!!v));
 const localByName=new Map(localSnapshot.map(t=>[(t.name||"").trim().toLowerCase(),t]));
 const merged=cloudRows.map(r=>{
  const localId=Object.keys(map).find(k=>map[k]===r.id);
  const existing=localById.get(r.id)||localByCloudId.get(r.id)||(localId?localById.get(localId):null)||localByName.get((r.name||"").trim().toLowerCase())||{};
  if(existing.id&&existing.id!==r.id)map[existing.id]=r.id;
  return {...existing,id:r.id,name:r.name,destination:r.destination||existing.destination||"",start:r.start_date||existing.start||"",end:r.end_date||existing.end||"",cover:r.cover_image_url||existing.cover||"",description:r.description||existing.description||"",status:r.status||existing.status||"planning",participants:existing.participants||[],budget:existing.budget||[],income:existing.income||[],cashflow:existing.cashflow||[],stays:existing.stays||[],destinations:existing.destinations||[],itinerary:existing.itinerary||[]};
 });
 const represented=new Set(merged.map(t=>t.id));
 const cloudMappedLocalIds=new Set(Object.keys(map));
 // Do not surface local-only trips in the active app when Supabase is available.
 // They remain in localStorage only as a fallback/backup.
 const localOnly=[];
 db.trips=[...merged,...localOnly];
 db.cloudTripMap=map;
 // Restore complete per-trip workspace snapshots from Supabase before enabling cloud writes.
 for(const item of db.trips){
  if(!cloudRows.some(r=>r.id===item.id))continue;
  try{const payload=await window.HolidayPlannerCloud.loadTripWorkspace(item.id);if(payload&&typeof payload==="object")Object.assign(item,payload,{id:item.id,name:item.name,destination:item.destination,start:item.start,end:item.end,cover:item.cover});}
  catch(error){console.warn("Workspace load skipped for",item.name,error);}
 }
 cloudSyncReady=true;
 save();
}
async function enter(pin){
 activeAdmin=null;memberName="";
 if(/^\d{6}$/.test(pin) && window.HolidayPlannerCloud?.loginWithPin){
  const loginBtn=document.querySelector("#loginBtn");
  if(loginBtn){loginBtn.disabled=true;loginBtn.textContent="Connecting…";}
  try{
   const result=await window.HolidayPlannerCloud.loginWithPin(pin);
   const role=result?.profile?.role;
   if(role==="master"){
    mode="master";tripId=null;page="All Trips";await hydrateTripsFromCloud();showApp();return;
   }
   if(role==="admin"){
    mode="admin";activeAdmin=result.user.id;tripId=null;page="Assigned Trips";await hydrateTripsFromCloud();showApp();return;
   }
   throw new Error("Akun tidak memiliki akses.");
  }catch(error){err(error.message||"PIN tidak sesuai. Coba lagi.");return;}
  finally{if(loginBtn){loginBtn.disabled=false;loginBtn.textContent="Continue →";}}
 }
 err("Layanan login Supabase belum siap. Muat ulang halaman dan coba lagi.");
}
function err(s){$("#loginError").textContent=s}
window.holidayPlannerLogin=()=>enter(document.querySelector("#pin").value.trim());
const loginBtn=document.querySelector("#loginBtn");loginBtn.type="button";
loginBtn.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();window.holidayPlannerLogin();},true);
$("#pin").addEventListener("keydown",e=>{if(e.key==="Enter")enter(e.target.value.trim())});
if($("#lock"))$("#lock").onclick=auth;
function assignedTrips(){
 if(mode==="master")return db.trips;
 if(mode==="admin")return db.trips;
 return[];
}
function navItems(){
 if(mode==="master")return tripId?[["Dashboard","home"],["General","settings"],["Participants","users"],["Income Planning","income"],["Expense Planning","wallet"],["Cash Flow","chart"],["Villas & Stay","bed"],["Destinations","pin"],["Itinerary","calendar"],["All Trips","back"]]:[["All Trips","grid"],["Create Trip","plus"],["Access Management","users"],["Settings","settings"]];
 if(mode==="admin")return tripId?[["Dashboard","home"],["General","settings"],["Participants","users"],["Income Planning","income"],["Expense Planning","wallet"],["Cash Flow","chart"],["Villas & Stay","bed"],["Destinations","pin"],["Itinerary","calendar"],["Settings","settings"],["Assigned Trips","back"]]:[["Assigned Trips","grid"],["Settings","settings"]];
 if(mode==="member")return [["Dashboard","home"],["General","settings"],["Participants","users"],["Income Planning","income"],["Expense Planning","wallet"],["Cash Flow","chart"],["Villas & Stay","bed"],["Destinations","pin"],["Itinerary","calendar"]];
 return [];
}
function updateSidebarProfile(){
 const el=document.querySelector(".sidebar-profile");if(!el)return;
 const role=mode==="master"?"Master Access":mode==="admin"?"Admin Access":"Member Access";
 el.innerHTML=`<div class="sidebar-profile-info"><strong>${role}</strong></div>`;
}
function showApp(){
 $("#login").classList.add("hidden");$("#app").classList.remove("hidden");
 $("#access").textContent=mode==="master"?"MASTER ACCESS":mode==="admin"?"ADMIN ACCESS":"MEMBER ACCESS · "+(trip().name||"");
 applyPlannerTheme();
 const appHeader=document.querySelector("#app>main>header");
 if(appHeader&&!$("#themeToggle")){const themeBtn=document.createElement("button");themeBtn.id="themeToggle";themeBtn.className="theme-toggle";appHeader.appendChild(themeBtn);}
 if(appHeader&&!$("#languageToggle")){const langBtn=document.createElement("button");langBtn.id="languageToggle";langBtn.className="theme-toggle language-toggle";appHeader.appendChild(langBtn);}
 applyPlannerTheme();applyPlannerLanguage();
 
 document.body.classList.toggle("member-view",mode==="member");
 updateSidebarProfile();
 $("#nav").innerHTML=navItems().map(([n,i])=>`<button type="button" data-page="${n}" class="${page===n?"active":""}">${hpIcon(i)}<span>${n}</span></button>`).join("")+` <button type="button" data-action="exit-trip" class="sidebar-logout">${hpIcon("back")}<span>Log out</span></button>`;
 const mobileNav=$("#mobileNav");
 if(mobileNav){
   const items=mode==="master"?[]:[["Dashboard","home"],["Expense Planning","wallet"],["Itinerary","calendar"],["Participants","users"],["More","more"]];
   mobileNav.innerHTML=items.map(([n,ic])=>`<button type="button" data-page="${n==="More"?"General":n}" class="${page===n?"active":""}">${hpIcon(ic)}<span>${n==="More"?(plannerLanguage==="id"?"Lainnya":"More"):n}</span></button>`).join("");
   mobileNav.classList.toggle("is-visible",items.length>0&&!pendingTripWelcome);
 }
 if(pendingTripWelcome&&tripId){document.body.classList.add("trip-welcome-mode");renderTripWelcome();return;}
 document.body.classList.remove("trip-welcome-mode");
 render();
}
function renderTripWelcome(){
 const t=trip();
 const role=mode==="master"?"Master Access":mode==="admin"?"Admin Access":"Member Access";
 pageHead("A new journey begins","Your trip workspace is ready.");
 $("#content").innerHTML=`<section class="trip-welcome" style="--welcome-cover:url('${esc(t.cover||"")}')">
   <div class="trip-welcome-shade"></div>
   <div class="trip-welcome-content">
     <span class="welcome-kicker">YOUR TRAVEL SPACE · ${esc(role.toUpperCase())}</span>
     <span class="welcome-mark">✦</span>
     <p class="welcome-overline">THE JOURNEY STARTS HERE</p>
     <h2>Welcome to<br><em>${esc(t.name||"Your Trip")}</em></h2>
     <p class="welcome-copy">A little escape, a lot of memories. Your time to explore, connect, and enjoy every moment starts now.</p>
     <div class="welcome-destination">⌖ ${esc(t.destination||"Your destination")}</div>
     <button class="welcome-enter" data-action="enter-trip">Enter your trip <span>→</span></button>
   </div>
 </section>`;
}
function trip(){const t=db.trips.find(x=>x.id===tripId);if(!t)return {};ensurePlans(t);const p=t.plans.find(x=>x.id===t.activePlanId)||t.plans[0];["budget","income","cashflow","stays","destinations","itinerary","budgetLimit"].forEach(k=>t[k]=p[k]??(k==="budgetLimit"?0:[]));return t}
function pageHead(t,s){$("#title").textContent=t;$("#subtitle").textContent=s}

function activePlanLabel(t){ensurePlans(t);return t.plans.find(p=>p.id===t.activePlanId)?.name||"Plan A";}
function planningCollectionPage(t,key){
 const dest=key==="destinations",title=dest?"Destinations":"Itinerary";
 if(!Array.isArray(t[key]))t[key]=[];
 if(t[key].length===0){const legacy=(t.plans||[]).flatMap(p=>p[key]||[]);const seen=new Set();t[key]=legacy.filter(x=>{const k=JSON.stringify(x);if(seen.has(k))return false;seen.add(k);return true;});}
 const fields=dest?[["name","Name"],["area","Area"],["ticket","Est. ticket (Rp)"],["notes","Notes"]]:[["date","Date"],["time","Time"],["title","Activity"],["place","Location"],["note","Notes"]];
 const items=t[key];
 const rows=items.map((x,i)=>`<tr>${fields.map(([k])=>`<td>${k==="ticket"?money(x[k]||0):esc(x[k]||"—")}</td>`).join("")}<td><button data-plan-edit="${key}:${i}">Edit</button> <button data-plan-delete="${key}:${i}">Delete</button></td></tr>`).join("");
 $("#content").innerHTML=`<section class="section"><div class="toolbar"><div><h2>${title}</h2><p>${dest?"Manage places to explore for this trip.":"Manage your trip schedule in one place."}</p></div><button class="primary" id="planningAdd" data-kind="${key}">＋ Add ${dest?"Destination":"Itinerary"}</button></div><div class="table-wrap"><table><thead><tr>${fields.map(([,label])=>`<th>${label}</th>`).join("")}<th>Actions</th></tr></thead><tbody>${rows||`<tr><td colspan="${fields.length+1}" class="empty">No ${title.toLowerCase()} added yet.</td></tr>`}</tbody></table></div></section>`;
}
function cashFlowPage(t){
 ensurePlans(t);
 const entries=(t.plans||[]).flatMap(p=>(p.cashflow||[]).map((x,i)=>({x,planId:p.id,index:i})));
 const legacy=(t.cashflow||[]).filter(x=>!entries.some(e=>e.x.id&&e.x.id===x.id)).map((x,i)=>({x,planId:"legacy",index:i}));
 const all=[...entries,...legacy],items=all.map(e=>e.x);
 const incoming=items.filter(x=>x.type==="Income").reduce((n,x)=>n+Number(x.amount||0),0);
 const outgoing=items.filter(x=>x.type==="Expense").reduce((n,x)=>n+Number(x.amount||0),0);
 const rows=all.map(({x,index,planId})=>`<tr><td>${esc(x.date||"—")}</td><td>${esc(x.type==="Income"?"Pemasukan":"Pengeluaran")}</td><td>${esc(x.description||"—")}</td><td>${money(x.amount)}</td><td>${esc(x.source==="Income Planning"?"Perencanaan Pemasukan":x.notes||"Input manual")}</td><td>${x.source==="Income Planning"?"Otomatis":`<button data-cf-edit="${planId}:${index}">Ubah</button> <button data-cf-delete="${planId}:${index}">Hapus</button>`}</td></tr>`).join("");
 $("#content").innerHTML=`<section class="section"><div class="toolbar"><div><h2>Cash Flow</h2><p>Track all money received and spent across this trip.</p></div><button class="primary" id="cashflowAdd">＋ Add transaction</button></div><div class="stats-grid"><article class="stat-card"><small>Total Income</small><strong>${money(incoming)}</strong></article><article class="stat-card"><small>Total Expense</small><strong>${money(outgoing)}</strong></article><article class="stat-card"><small>Net Cash Flow</small><strong>${money(incoming-outgoing)}</strong></article></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Source / Notes</th><th>Action</th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="empty">No transactions recorded yet.</td></tr>'}</tbody></table></div><p class="muted">Income marked as Received in Income Planning appears here automatically.</p></section>`;
}
function openPlanningForm(key,index=null){
 const t=trip();if(!Array.isArray(t[key]))t[key]=[];const p=t;const isDest=key==="destinations",fields=isDest?[["name","Name","text"],["area","Area","text"],["ticket","Estimated ticket (Rp)","number"],["notes","Notes","textarea"]]:[["date","Date","date"],["time","Time","time"],["activity","Activity","text"],["location","Location","text"],["notes","Notes","textarea"]];
 const old=index===null?{}:(p[key]||[])[index]||{};
 const dialog=document.createElement("dialog");dialog.className="planner-dialog";dialog.id="dynamicPlannerDialog";
 dialog.innerHTML=`<form id="dynamicPlannerForm"><h2>${index===null?"Add":"Edit"} ${isDest?"Destination":"Itinerary"}</h2><input type="hidden" name="key" value="${key}"><input type="hidden" name="index" value="${index===null?"":index}">${fields.map(([k,label,type])=>`<label>${label}${type==="textarea"?`<textarea name="${k}">${esc(old[k]||"")}</textarea>`:`<input name="${k}" type="${type}" value="${esc(old[k]??"")}">`}</label>`).join("")}<div class="dialog-actions"><button type="button" class="secondary" id="dynamicCancel">Cancel</button><button class="primary" type="submit">Save</button></div></form></dialog>`;
 document.body.appendChild(dialog);dialog.showModal();dialog.querySelector("#dynamicCancel").onclick=()=>dialog.remove();
 dialog.querySelector("form").onsubmit=e=>{e.preventDefault();if(!canManageTrip())return toast("Member Access hanya untuk melihat data.");const data=Object.fromEntries(new FormData(e.target));delete data.key;delete data.index;if(isDest)data.ticket=Number(data.ticket||0);if(index===null)p[key].push(data);else p[key][index]=data;save();dialog.close();dialog.remove();planningCollectionPage(t,key);};
}
function openCashFlowForm(index=null){
 const t=trip();ensurePlans(t);const p=t.plans.find(x=>x.id===t.activePlanId);const old=index===null?{}:p.cashflow[index]||{};
 const d=document.createElement("dialog");d.className="planner-dialog";d.innerHTML=`<form id="cashFlowForm"><h2>${index===null?"Add":"Edit"} transaction</h2><label>Date<input type="date" name="date" value="${esc(old.date||"")}"></label><label>Type<select name="type"><option ${old.type==="Income"?"selected":""}>Income</option><option ${old.type==="Expense"?"selected":""}>Expense</option></select></label><label>Description<input name="description" required value="${esc(old.description||"")}"></label><label>Amount (Rp)<input type="number" min="0" name="amount" required value="${Number(old.amount||0)}"></label><label>Notes<textarea name="notes">${esc(old.notes||"")}</textarea></label><div class="dialog-actions"><button type="button" class="secondary" id="cfCancel">Cancel</button><button class="primary">Save transaction</button></div></form></dialog>`;
 document.body.appendChild(d);d.showModal();d.querySelector("#cfCancel").onclick=()=>d.remove();d.querySelector("form").onsubmit=e=>{e.preventDefault();if(!canManageTrip())return toast("Member Access hanya untuk melihat data.");const x=Object.fromEntries(new FormData(e.target));x.amount=Number(x.amount);x.source="Manual";if(index===null)p.cashflow.push(x);else p.cashflow[index]=x;t.cashflow=p.cashflow;save();d.close();d.remove();cashFlowPage(t);};
}
function render(){
 if(mode==="master"){if(page==="All Trips"||!tripId){if(page==="Settings")return settings();if(page==="Access Management")return accessManagement();if(page==="Create Trip"){openTrip();page="All Trips";return;}return allTrips();}return tripPage();}
 if(mode==="admin"){if(page==="Settings")return settings();if(page==="Assigned Trips"||!tripId)return assignedTripsPage();return tripPage();}
 if(mode==="member")return tripPage();
}

function assignedTripsPage(){
 page="Assigned Trips";pageHead("Assigned Trips","Trips assigned to your Admin account.");
 const cards=assignedTrips().map(t=>`<article class="trip"><div class="cover" style="background-image:url('${esc(t.cover||"")}')"></div><div class="tripbody"><h3>${esc(t.name)}</h3><p>◎ ${esc(t.destination)}</p><p>${date(t.start)} – ${date(t.end)}</p><div class="actions"><button class="primary" data-open="${t.id}">Manage trip</button></div></div></article>`).join("");
 $("#content").innerHTML=`<div class="toolbar"><div><h2>My Assigned Trips</h2><p>Only trips assigned by Master are available here.</p></div></div><div class="grid">${cards||'<div class="empty">Belum ada trip yang ditugaskan.</div>'}</div>`;
}
function accessManagement(){
 page="Access Management";pageHead("Access Management","Create Admin accounts and control which trips they can manage.");
 const rows=db.admins.map(a=>`<tr><td><strong>${esc(a.name)}</strong></td><td>${(a.trips||[]).map(id=>esc(db.trips.find(t=>t.id===id)?.name||id)).join(", ")||'<span class="muted">No trip assigned</span>'}</td><td><button class="admin-remove" data-removeadmin="${a.id}">Remove</button></td></tr>`).join("");
 const tripChoices=db.trips.map(t=>`<label class="trip-choice"><input type="checkbox" name="adminTrip" value="${t.id}"><span><strong>${esc(t.name)}</strong><small>${esc(t.destination||"")}</small></span></label>`).join("");
 $("#content").innerHTML=`
 <section class="section access-create">
   <div class="access-section-heading"><div><span class="eyebrow">NEW ACCOUNT</span><h2>Create Admin Account</h2><p>Add an administrator and choose which trips they can access.</p></div><span class="access-icon">＋</span></div>
   <div class="admin-form-grid">
     <label class="admin-field">Admin name<input id="newAdminName" placeholder="e.g. Amelia" autocomplete="off"></label>
     <label class="admin-field">Admin PIN <span class="field-hint">6 digits</span><input id="newAdminPin" inputmode="numeric" maxlength="6" placeholder="Enter 6-digit PIN" autocomplete="new-password"></label>
   </div>
   <div class="admin-field trip-assignment"><div class="assignment-heading"><div><strong>Trip access</strong><small>Select the trips this Admin is allowed to manage.</small></div><span class="selection-count" id="adminTripCount">0 selected</span></div>
     <div class="trip-choice-grid">${tripChoices||'<div class="empty">Create a trip first to assign access.</div>'}</div>
   </div>
   <div class="admin-form-footer"><p>Admins can only view and manage the trips selected above.</p><button class="primary" id="createAdmin">Create Admin Account <span>→</span></button></div>
 </section>
 <section class="section admin-list-section">
   <div class="toolbar"><div><span class="eyebrow">ACCESS DIRECTORY</span><h2>Admin Accounts</h2><p>${db.admins.length} administrator account${db.admins.length===1?"":"s"} created</p></div><span class="account-count">${db.admins.length}</span></div>
   ${db.admins.length?`<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>ADMIN</th><th>ASSIGNED TRIPS</th><th class="remove-col">ACTION</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="admin-empty"><span>♙</span><strong>No Admin accounts yet</strong><p>Create an account above to give someone access to selected trips.</p></div>'}
 </section>`;
 const updateCount=()=>{const n=$("#content").querySelectorAll('input[name="adminTrip"]:checked').length;$("#adminTripCount").textContent=`${n} selected`;};
 $("#content").querySelectorAll('input[name="adminTrip"]').forEach(x=>x.addEventListener("change",updateCount));
}
function canManageTrip(){return mode==="master"||(mode==="admin"&&assignedTrips().some(t=>t.id===tripId));}
function isMemberViewOnly(){return mode==="member";}
function addMemberRequest(section,summary,note="",change=null){
 db.requests.push({id:"req_"+Date.now()+"_"+Math.random().toString(36).slice(2,7),tripId,requester:memberName,section,summary,note,change,status:"Pending",createdAt:new Date().toISOString()});
 save();toast("Request submitted for approval.");page="My Requests";render();
}
function applyApprovedChange(r){
 const t=db.trips.find(x=>x.id===r.tripId);
 if(!t)throw new Error("Trip tidak ditemukan.");
 const c=r.change;
 if(!c||!["add","update","delete","replace"].includes(c.action))throw new Error("Format perubahan tidak valid.");
 const allowed=["participants","budget","cashflow","stays","destinations","itinerary"];
 if(c.key==="general"){
   if(c.action!=="update"||!c.data||typeof c.data!=="object"||Array.isArray(c.data))throw new Error("Perubahan General harus menggunakan action update dan object data.");
   const safe=["name","destination","start","end","cover"];
   Object.keys(c.data).forEach(k=>{if(!safe.includes(k))throw new Error("Field General tidak diizinkan: "+k);});
   Object.assign(t,c.data);
 }else{
   if(!allowed.includes(c.key))throw new Error("Bagian data tidak diizinkan.");
   if(!Array.isArray(t[c.key]))t[c.key]=[];
   const arr=t[c.key];
   if(c.action==="add"){
     if(!c.data||typeof c.data!=="object"||Array.isArray(c.data))throw new Error("Data item harus berupa object JSON.");
     arr.push(c.data);
   }else if(c.action==="replace"){
     if(!Array.isArray(c.data))throw new Error("Replace membutuhkan JSON array.");
     t[c.key]=c.data;
   }else{
     const i=Number(c.index);
     if(!Number.isInteger(i)||i<0||i>=arr.length)throw new Error("Index item tidak ditemukan.");
     if(c.action==="delete")arr.splice(i,1);
     else{
       if(!c.data||typeof c.data!=="object"||Array.isArray(c.data))throw new Error("Data edit harus berupa object JSON.");
       arr[i]={...arr[i],...c.data};
     }
   }
 }
 save();
}
function allTrips(){page="All Trips";pageHead("All Trips","Plan, organize, and keep track of all your journeys.");$("#nav").querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.page==="All Trips"));let cards=db.trips.map(t=>{let budget=t.budget.reduce((a,x)=>a+ +x.amount,0),spent=t.cashflow.filter(x=>x.type==="Expense").reduce((a,x)=>a+ +x.amount,0),pct=budget?Math.min(100,spent/budget*100):0;return `<article class="trip"><div class="cover" style="background-image:url('${esc(t.cover||"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=80")}')"></div><div class="tripbody"><h3>${esc(t.name)}</h3><p>▦ ${date(t.start)} – ${date(t.end)}</p><p>◎ ${esc(t.destination)}</p><div class="tripfoot"><span>${money(spent)} spent</span><b>${pct.toFixed(0)}%</b></div><div class="bar"><i style="width:${pct}%"></i></div><div class="actions"><button class="primary" data-open="${t.id}">Open trip</button><button data-edittrip="${t.id}">Trip Settings / PIN</button><button data-deltrip="${t.id}">Delete</button></div></div></article>`}).join("");$("#content").innerHTML=`<section class="hero" style="background-image:url('https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=85')"><span class="pill">MASTER ACCESS</span><h2>Every trip, one place.</h2><p>Keep your journeys organized and ready for the next adventure.</p></section><div class="toolbar"><div><h2 style="font:600 23px 'Playfair Display'">My Trips (${db.trips.length})</h2><p>Choose a trip to open its private workspace.</p></div><button class="primary" id="newTrip">＋ Create New Trip</button></div><div class="grid">${cards||'<div class="empty">Belum ada perjalanan. Buat trip pertamamu.</div>'}</div>`}
function settings(){page="Settings";pageHead("Settings","Manage your profile and backup data.");const isAdmin=mode==="admin",scopeTrips=isAdmin?assignedTrips():db.trips;const profile=isAdmin?"":`<section class="section"><h2>Profile Settings</h2><div class="profile-setting">${db.admin.photo?`<img id="profilePreview" src="${db.admin.photo}" alt="Profile photo">`:`<div class="profile-placeholder" id="profilePreview">${esc((db.admin.name||"AD").split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase())}</div>`}<div><strong>${esc(db.admin.name||"Fiqi Naufaldy")}</strong><p style="font-size:11px;color:#788177;margin:5px 0 9px">Account profile</p><label class="profile-upload" for="profilePhoto">↑ Upload profile photo</label><input id="profilePhoto" type="file" accept="image/png,image/jpeg,image/webp" hidden></div></div><div class="formgrid"><label>Display name<input id="adminName" value="${esc(db.admin.name)}"></label><label>New Master PIN (optional)<input id="adminPin" inputmode="numeric" maxlength="6" placeholder="Leave blank to keep current"></label></div><p><button class="primary" id="saveAdmin">Save Settings</button></p><p style="font-size:11px;color:#788177">Foto dan nama ini ditampilkan di footer sidebar sebagai identitas pemilik akun.</p></section>`;const scopeText=isAdmin?`Backup hanya mencakup ${scopeTrips.length} trip yang ditugaskan ke akun Admin ini. Data trip lain dan pengaturan akses Master tidak akan berubah saat restore.`:"Backup mencakup seluruh trip, akun Admin, dan profil Master.";$("#content").innerHTML=`${profile}<section class="section"><h2>Backup & Restore</h2><p>${scopeText}</p><div class="actions backup-actions"><button class="primary" id="export">${hpIcon("download")}<span>${isAdmin?"Export Assigned Trips":"Export All Data"}</span></button><button id="import">${hpIcon("upload")}<span>Import Backup</span></button></div><p style="font-size:11px;color:#788177">Simpan file backup di tempat aman. Saat import, data pada cakupan backup akan menggantikan data yang sekarang.</p></section>`}
const labels={General:"Trip information",Participants:"People joining this trip",Budgeting:"Plan trip expenses", "Cash Flow":"Track income and expenses","Villas & Stay":"Accommodation options",Destinations:"Places to explore",Itinerary:"Schedule your trip"};
function tripPage(){let t=trip();pageHead(page==="Dashboard"?t.name:page,labels[page]||"Your trip workspace");$("#nav").querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));if(page==="Destinations")return planningCollectionPage(t,"destinations");if(page==="Itinerary")return planningCollectionPage(t,"itinerary");if(page==="Cash Flow")return cashFlowPage(t);if(page==="Dashboard")return dashboard(t);if(page==="General")return general(t);if(page==="Participants")return participantsPage(t);if(page==="Expense Planning")return budgetPage(t);if(page==="Income Planning")return incomePage(t);if(page==="Villas & Stay")return villasPage(t);let key={"Participants":"participants","Expense Planning":"budget","Income Planning":"income","Cash Flow":"cashflow","Villas & Stay":"stays","Destinations":"destinations","Itinerary":"itinerary"}[page];let arr=t[key]||[];let fields={participants:["Name","Contact","Role","Status"],budget:["Category","Description","Amount"],cashflow:["Date","Type","Description","Amount"],stays:["Name","Area","Check-in","Check-out","Price"],destinations:["Name","Area","Est. ticket"],itinerary:["Date","Time","Activity","Location","Notes"]}[key];let rows=arr.map((x,i)=>`<tr>${Object.values(x).map(v=>`<td>${esc(typeof v==="number"&&["amount","price","cost"].includes("")?money(v):v)}</td>`).join("")}<td><button data-delitem="${key}:${i}">Delete</button></td></tr>`).join("");$("#content").innerHTML=`<section class="section"><div class="toolbar"><div><h2>${page}</h2><p>${arr.length} item(s) recorded.</p></div><button class="primary" id="addItem" data-key="${key}">＋ Add ${page}</button></div><div style="overflow:auto"><table><thead><tr>${fields.map(x=>`<th>${x}</th>`).join("")}<th>Action</th></tr></thead><tbody>${rows||`<tr><td colspan="${fields.length+1}" class="empty">No data yet.</td></tr>`}</tbody></table></div></section>`}

function budgetPage(t){
 if(!Array.isArray(t.budget))t.budget=[];
 if(!Array.isArray(t.cashflow))t.cashflow=[];
 const items=t.budget;
 const budgetLimit=Number(t.budgetLimit||items.reduce((sum,x)=>sum+Number(x.amount||0),0));
 const allocated=items.reduce((sum,x)=>sum+Number(x.amount||0),0);
 const payments=t.cashflow.filter(x=>x.type==="Expense");
 const paid=payments.reduce((sum,x)=>sum+Number(x.amount||0),0);
 const outstanding=Math.max(0,allocated-paid);
 const unallocated=Math.max(0,budgetLimit-allocated);
 const pct=budgetLimit?Math.min(100,allocated/budgetLimit*100):0;
 const safePct=budgetLimit?Math.min(100,paid/budgetLimit*100):0;
 const [activeTab,setTab]=["Expenses",null];
 const grouped={};items.forEach(x=>grouped[x.category||"Other"]=(grouped[x.category||"Other"]||0)+Number(x.amount||0));
 const rows=items.map((x,i)=>`<article class="budget-item"><div class="budget-item-icon">${budgetIcon(x.category)}</div><div class="budget-item-main"><strong>${esc(x.description||x.category||"Expense")}</strong><small>${esc(x.category||"Other")}${x.notes?` · ${esc(x.notes)}`:""}</small><div class="budget-item-track"><i style="width:${allocated?Math.min(100,Number(x.amount||0)/allocated*100):0}%"></i></div></div><div class="budget-item-amount"><strong>${money(x.amount)}</strong><small>Planned</small></div><div class="budget-item-actions"><button data-editbudget="${i}" aria-label="Edit budget">Edit</button><button data-delbudget="${i}" aria-label="Delete budget">×</button></div></article>`).join("");
 const paymentRows=payments.map(x=>`<article class="budget-item"><div class="budget-item-icon paid-icon">✓</div><div class="budget-item-main"><strong>${esc(x.description||"Payment")}</strong><small>${esc(x.date||"Payment")}</small></div><div class="budget-item-amount"><strong>${money(x.amount)}</strong><small>Paid</small></div></article>`).join("");
 const breakdown=Object.entries(grouped).sort((a,b)=>b[1]-a[1]).map(([name,value])=>`<div class="budget-category-row"><div class="budget-category-head"><span>${esc(name)}</span><strong>${money(value)}</strong></div><div class="budget-category-track"><i style="width:${allocated?Math.min(100,value/allocated*100):0}%"></i></div><small>${allocated?(value/allocated*100).toFixed(1):"0"}% of allocated budget</small></div>`).join("");
 $("#content").innerHTML=`
 <div class="budget-page">
  <div class="budget-topline"><div><span class="budget-eyebrow">${money(allocated)} <span>of</span> ${money(budgetLimit)} allocated</span><h2>Expense Planning</h2><p>Plan and monitor the expenses for this trip.</p></div><div class="budget-top-actions"><button class="budget-export" id="exportBudget">↓　Export</button><button class="budget-add" id="addBudget">＋　Add expense</button></div></div>
  <div class="budget-plan-switch" role="tablist" aria-label="Expense plan">${t.plans.filter(p=>p.enabled).map(p=>`<button type="button" data-switch-plan="${p.id}" class="${p.id===t.activePlanId?"active":""}">${esc(p.name)}</button>`).join("")}</div>
  <div class="budget-summary-grid">
   <article class="budget-summary-card budget-card-limit"><small>TRIP BUDGET</small><strong>${money(budgetLimit)}</strong><span>Overall budget limit</span></article>
   <article class="budget-summary-card budget-card-allocated"><small>ALLOCATED</small><strong>${money(allocated)}</strong><span>${budgetLimit?(allocated/budgetLimit*100).toFixed(0):0}% of trip budget</span></article>
   <article class="budget-summary-card budget-card-paid"><small>PAID</small><strong>${money(paid)}</strong><span>${allocated?(paid/allocated*100).toFixed(0):0}% of allocated</span></article>
   <article class="budget-summary-card budget-card-outstanding"><small>OUTSTANDING</small><strong>${money(outstanding)}</strong><span>${money(unallocated)} not allocated</span></article>
  </div>
  <section class="budget-health">
   <div class="budget-health-head"><div><span>BUDGET HEALTH</span><b class="${pct>100?"over":pct>85?"watch":"safe"}">${pct>100?"Over budget":pct>85?"Watch":"On track"}</b></div><small>${money(allocated)} of ${money(budgetLimit)}</small></div>
   <div class="budget-health-track"><i style="width:${pct}%"></i></div>
   <div class="budget-health-foot"><span>${pct.toFixed(1)}% allocated</span><span>${money(unallocated)} remaining to allocate</span></div>
  </section>
  <div class="budget-tabs" role="tablist"><button class="active" data-budget-tab="expenses">Expenses <span>${items.length}</span></button><button data-budget-tab="payments">Payments <span>${payments.length}</span></button><button data-budget-tab="plan">Category plan</button></div>
  <section class="budget-list-panel" id="budgetTabContent">
   <div class="budget-list-heading"><div><h3>Planned expenses</h3><p>Manage the costs you expect during this trip.</p></div><strong>${money(allocated)}</strong></div>
   <div class="budget-items">${rows||'<div class="budget-empty">No expenses planned yet. Add your first expense to get started.</div>'}</div>
  </section>
 </div>`;
 const tabContent=$("#budgetTabContent");
 $("#content").querySelectorAll("[data-budget-tab]").forEach(btn=>btn.addEventListener("click",()=>{
   $("#content").querySelectorAll("[data-budget-tab]").forEach(x=>x.classList.toggle("active",x===btn));
   const tab=btn.dataset.budgetTab;
   if(tab==="expenses")tabContent.innerHTML=`<div class="budget-list-heading"><div><h3>Planned expenses</h3><p>Manage the costs you expect during this trip.</p></div><strong>${money(allocated)}</strong></div><div class="budget-items">${rows||'<div class="budget-empty">No expenses planned yet. Add your first expense to get started.</div>'}</div>`;
   if(tab==="payments")tabContent.innerHTML=`<div class="budget-list-heading"><div><h3>Payment history</h3><p>Payments recorded in Cash Flow.</p></div><strong>${money(paid)}</strong></div><div class="budget-items">${paymentRows||'<div class="budget-empty">No payments recorded yet. Add an Expense in Cash Flow.</div>'}</div>`;
   if(tab==="plan")tabContent.innerHTML=`<div class="budget-list-heading"><div><h3>Category allocation</h3><p>See how your planned budget is distributed.</p></div><strong>${money(allocated)}</strong></div><div class="budget-category-list">${breakdown||'<div class="budget-empty">Category allocation will appear here after you add expenses.</div>'}</div>`;
 }));
 const exp=$("#exportBudget");
 if(exp)exp.onclick=()=>{
   const data={trip:t.name,budgetLimit,allocated,paid,outstanding,expenses:items,payments};
   const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
   const a=document.createElement("a"),url=URL.createObjectURL(blob);a.href=url;a.download="holiday-planner-expense-plan.json";a.click();URL.revokeObjectURL(url);
 };
}

function incomePage(t){
 if(!Array.isArray(t.income))t.income=[];
 const items=t.income;
 const total=items.reduce((n,x)=>n+Number(x.amount||0),0);
 const received=items.filter(x=>x.status==="Received").reduce((n,x)=>n+Number(x.amount||0),0);
 const pending=total-received;
 const rows=items.map((x,i)=>`<article class="budget-item"><div class="budget-item-icon paid-icon">＋</div><div class="budget-item-main"><strong>${esc(x.source||"Income")}</strong><small>${esc(x.date||"No date")}${x.notes?" · "+esc(x.notes):""}</small></div><div class="budget-item-amount"><strong>${money(x.amount)}</strong><small>${x.status==="Received"?"✓ Received":"○ Planned"}</small></div><div class="budget-item-actions"><button data-editincome="${i}">Edit</button><button data-delincome="${i}">×</button></div></article>`).join("");
 $("#content").innerHTML=`<div class="budget-page">
 <div class="budget-topline"><div><span class="budget-eyebrow">${money(total)} planned income</span><h2>Income Planning</h2><p>Plan the funds available for this trip.</p></div><div class="budget-top-actions"><button class="budget-add" id="addIncome">＋ Add income</button></div></div>
 <div class="budget-plan-switch" role="tablist" aria-label="Income plan">${t.plans.filter(p=>p.enabled).map(p=>`<button type="button" data-switch-plan="${p.id}" class="${p.id===t.activePlanId?"active":""}">${esc(p.name)}</button>`).join("")}</div>
 <div class="budget-summary-grid">
 <article class="budget-summary-card budget-card-limit"><small>PLANNED INCOME</small><strong>${money(total)}</strong><span>Total expected funds</span></article>
 <article class="budget-summary-card budget-card-paid"><small>RECEIVED</small><strong>${money(received)}</strong><span>Funds already received</span></article>
 <article class="budget-summary-card budget-card-allocated"><small>AWAITING</small><strong>${money(pending)}</strong><span>Expected but not received</span></article>
 </div>
 <section class="budget-list-panel"><div class="budget-list-heading"><div><h3>Income Sources</h3><p>Manage every source of trip funding.</p></div><strong>${money(total)}</strong></div>
 <div class="budget-items">${rows||'<div class="budget-empty">No income sources yet. Add your first source of funds.</div>'}</div></section>
 </div>`;
}

function budgetIcon(category){
 const c=String(category||"").toLowerCase();
 if(c.includes("accom")||c.includes("villa")||c.includes("hotel"))return "⌂";
 if(c.includes("transport"))return "↗";
 if(c.includes("food"))return "♨";
 if(c.includes("ticket")||c.includes("activ"))return "✦";
 if(c.includes("shop"))return "◇";
 return "＋";
}
function openBudget(index=null){
  const t=trip();ensurePlans(t);syncPlan(t);
  const f=$("#budgetForm");f.reset();$("#budgetIndex").value=index===null?"":String(index);
  const active=t.plans.find(p=>p.id===t.activePlanId)||t.plans[0];
  $("#budgetSourcePlan").value=index===null?active.id:active.id;
  $("#budgetPlanSelect").innerHTML=t.plans.map(p=>`<option value="${p.id}" ${p.enabled?"":"disabled"}>${esc(p.name)}${p.enabled?"":" (Disabled)"}</option>`).join("");
  $("#budgetPlanSelect").value=active.id;
  $("#budgetModalTitle").textContent=index===null?"Add Budget Item":"Edit Budget Item";
  if(index!==null){
   const x=active.budget[index]||{};
   f.elements.category.value=x.category||"Other";f.elements.description.value=x.description||"";
   f.elements.amount.value=x.amount||0;f.elements.notes.value=x.notes||"";
   $("#budgetPlanSelect").value=active.id;
  }
  $("#budgetModal").showModal();
}
$("#budgetForm").onsubmit=e=>{
 e.preventDefault();if(!canManageTrip())return toast("Member Access hanya untuk melihat data.");
 const t=trip();ensurePlans(t);syncPlan(t);
 const f=e.target,index=$("#budgetIndex").value,sourceId=$("#budgetSourcePlan").value,targetId=$("#budgetPlanSelect").value;
 const source=t.plans.find(p=>p.id===sourceId),target=t.plans.find(p=>p.id===targetId);
 const item={category:f.elements.category.value,description:f.elements.description.value.trim(),amount:Number(f.elements.amount.value),notes:f.elements.notes.value.trim()};
 if(!target||!target.enabled)return toast("Pilih plan yang aktif.");
 if(!item.description||!Number.isFinite(item.amount)||item.amount<0)return toast("Periksa deskripsi dan nominal budget.");
 if(index!==""){
  const oldIndex=Number(index);
  if(source&&source.budget&&source.budget[oldIndex]){
   if(sourceId===targetId)source.budget[oldIndex]=item;
   else{source.budget.splice(oldIndex,1);target.budget.push(item);}
  }else target.budget.push(item);
 }else target.budget.push(item);
 if(t.activePlanId===sourceId)t.budget=source.budget;
 if(t.activePlanId===targetId)t.budget=target.budget;
 save();$("#budgetModal").close();budgetPage(trip());
 toast(index===""?"Budget item added to "+target.name:"Budget item saved to "+target.name);
};
$("#cancelBudget").onclick=()=>$("#budgetModal").close();
function syncIncomeCashflow(t,plan,item){
 if(!Array.isArray(plan.cashflow))plan.cashflow=[];
 const id=item.cashflowId||("income_"+Date.now()+"_"+Math.random().toString(36).slice(2,8));
 item.cashflowId=id;
 const existing=plan.cashflow.findIndex(x=>x.id===id||x.incomeId===id);
 if(item.status==="Received"){
  const entry={id,incomeId:id,date:item.date||"",type:"Income",description:item.source,amount:Number(item.amount||0),notes:item.notes||"",source:"Income Planning"};
  if(existing>=0)plan.cashflow[existing]=entry;else plan.cashflow.push(entry);
 }else if(existing>=0)plan.cashflow.splice(existing,1);
 if(t.activePlanId===plan.id)t.cashflow=plan.cashflow;
}
function openIncome(index=null){
 const t=trip();ensurePlans(t);syncPlan(t);
 const f=$("#incomeForm");f.reset();$("#incomeIndex").value=index===null?"":String(index);
 $("#incomeModalTitle").textContent=index===null?"Add Income":"Edit Income";
 $("#incomePlanSelect").innerHTML=t.plans.map(p=>`<option value="${p.id}" ${p.enabled?"":"disabled"}>${esc(p.name)}${p.enabled?"":" (Disabled)"}</option>`).join("");
 const active=t.plans.find(p=>p.id===t.activePlanId)||t.plans[0];
 $("#incomeSourcePlan").value=active.id;$("#incomePlanSelect").value=active.id;
 if(index!==null){const x=active.income[index]||{};f.elements.source.value=x.source||"";f.elements.amount.value=x.amount||0;f.elements.date.value=x.date||"";f.elements.status.value=x.status||"Planned";f.elements.notes.value=x.notes||"";}
 $("#incomeModal").showModal();
}
$("#incomeForm").onsubmit=e=>{
 e.preventDefault();if(!canManageTrip())return toast("Member Access hanya untuk melihat data.");
 const t=trip();ensurePlans(t);syncPlan(t);
 const f=e.target,index=$("#incomeIndex").value,sourceId=$("#incomeSourcePlan").value,targetId=$("#incomePlanSelect").value;
 const source=t.plans.find(p=>p.id===sourceId),target=t.plans.find(p=>p.id===targetId);
 const item={source:f.elements.source.value.trim(),amount:Number(f.elements.amount.value),date:f.elements.date.value,status:f.elements.status.value,notes:f.elements.notes.value.trim()};
 if(!target||!target.enabled)return toast("Pilih plan yang aktif.");
 if(!item.source||!Number.isFinite(item.amount)||item.amount<0)return toast("Periksa sumber dan nominal pemasukan.");
 if(index!==""){
  const old=source?.income?.[Number(index)];
  if(old)item.cashflowId=old.cashflowId;
  if(source&&source.income&&source.income[Number(index)]){
   syncIncomeCashflow(t,source,old||{});
   if(sourceId===targetId)source.income[Number(index)]=item;
   else{source.income.splice(Number(index),1);target.income.push(item);}
  }else target.income.push(item);
 }else target.income.push(item);
 const saved=target.income[target.income.length-1];
 syncIncomeCashflow(t,target,saved);
 if(t.activePlanId===sourceId)t.income=source.income;
 if(t.activePlanId===targetId)t.income=target.income;
 save();$("#incomeModal").close();incomePage(trip());toast(index===""?"Income added to "+target.name:"Income saved to "+target.name);
};
$("#cancelIncome").onclick=()=>$("#incomeModal").close();



function villasPage(t){
  if(!Array.isArray(t.stays))t.stays=[];
  const stays=t.stays;
  const total=stays.length, booked=stays.filter(x=>x.status==="Booked").length, shortlist=stays.filter(x=>x.status==="Shortlisted").length, available=stays.filter(x=>x.status==="Available"||!x.status).length;
  const cards=stays.map((v,i)=>`<article class="stay-card"><button class="stay-photo" data-villadetail="${i}" style="background-image:url('${esc(v.photos?.[0]||v.photo||'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=85')}')" aria-label="View ${esc(v.name)}"></button><div class="stay-card-body"><div class="stay-card-top"><div><h3>${esc(v.name)}</h3><p>⌖ ${esc(v.area||v.location||'Location not set')}</p></div><span class="status ${String(v.status||'Available').toLowerCase()}">${esc(v.status||'Available')}</span></div><div class="stay-meta"><span>♙ ${esc(v.guests||'—')} Guests</span><span>▤ ${esc(v.bedrooms||'—')} Beds</span><span>▱ ${esc(v.bathrooms||'—')} Baths</span></div><div class="stay-price">${money(v.price||0)} <small>/ night</small></div><div class="stay-card-actions"><button data-villadetail="${i}">View details ↗</button><button data-editvilla="${i}">Edit</button></div></div></article>`).join('');
  $('#content').innerHTML=`<section class="stay-intro"><div><span class="eyebrow">ACCOMMODATION COLLECTION</span><h2>Find your perfect stay.</h2><p>Explore, compare, and save the best places for ${esc(t.name)}.</p></div><div class="stay-intro-count"><b>${total}</b><span>Properties</span></div></section><div class="stay-stats"><div><small>Total Villas</small><b>${total}</b></div><div><small>Booked</small><b>${booked}</b></div><div><small>Shortlisted</small><b>${shortlist}</b></div><div><small>Available</small><b>${available}</b></div></div><div class="stay-toolbar"><label class="stay-search">⌕ <input id="villaSearch" placeholder="Search villa or location..."></label><select id="villaFilter"><option value="All">All properties</option><option>Available</option><option>Shortlisted</option><option>Booked</option></select><button class="primary" id="addVilla">＋ Add Villa</button></div><div class="stay-list" id="stayList">${cards||'<div class="stay-empty"><span>⌂</span><h3>Your stay collection starts here.</h3><p>Add villas and accommodation options to compare them in one place.</p><button class="primary" id="addVillaEmpty">＋ Add your first villa</button></div>'}</div>`;
  const search=$('#villaSearch'), filter=$('#villaFilter');
  function apply(){let q=search.value.toLowerCase(),f=filter.value;$('#stayList').innerHTML=stays.map((v,i)=>({v,i})).filter(({v})=>(!q||`${v.name} ${v.area||v.location||''}`.toLowerCase().includes(q))&&(f==='All'||(v.status||'Available')===f)).map(({v,i})=>`<article class="stay-card"><button class="stay-photo" data-villadetail="${i}" style="background-image:url('${esc(v.photos?.[0]||v.photo||'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=85')}')"></button><div class="stay-card-body"><div class="stay-card-top"><div><h3>${esc(v.name)}</h3><p>⌖ ${esc(v.area||v.location||'Location not set')}</p></div><span class="status ${String(v.status||'Available').toLowerCase()}">${esc(v.status||'Available')}</span></div><div class="stay-meta"><span>♙ ${esc(v.guests||'—')} Guests</span><span>▤ ${esc(v.bedrooms||'—')} Beds</span><span>▱ ${esc(v.bathrooms||'—')} Baths</span></div><div class="stay-price">${money(v.price||0)} <small>/ night</small></div><div class="stay-card-actions"><button data-villadetail="${i}">View details ↗</button><button data-editvilla="${i}">Edit</button></div></div></article>`).join('')||'<div class="stay-empty"><h3>No matching properties</h3><p>Try another search or filter.</p></div>'}
  search.addEventListener('input',apply);filter.addEventListener('change',apply);
}
let villaPendingPhotos=[];
function renderVillaPhotoPreview(){const box=$("#villaPhotoPreview");if(!box)return;box.innerHTML=villaPendingPhotos.map((src,i)=>`<div class="villa-preview-item"><img src="${src}" alt="Villa photo ${i+1}"><button type="button" data-remove-villaphoto="${i}" aria-label="Remove photo">×</button></div>`).join("")||'<span class="villa-preview-empty">No photos selected yet.</span>'}
function compressVillaImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{const max=1500,scale=Math.min(1,max/Math.max(img.width,img.height));const canvas=document.createElement("canvas");canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/webp",.76))};img.src=reader.result};reader.readAsDataURL(file)})}
function openVilla(index=null){if(!canManageTrip())return toast("Member harus mengirim request melalui My Requests.");const f=$("#villaForm");f.reset();$("#villaIndex").value=index===null?"":String(index);$("#villaModalTitle").textContent=index===null?"Add Villa":"Edit Villa";villaPendingPhotos=[];if(index!==null){const v=trip().stays[index]||{};for(const k of ["name","area","price","guests","bedrooms","bathrooms","status","referenceLink","description","facilities","notes"])if(f.elements[k])f.elements[k].value=v[k]??"";villaPendingPhotos=(v.photos&&v.photos.length?v.photos:(v.photo?[v.photo]:[])).slice(0,6)}renderVillaPhotoPreview();$("#villaModal").showModal()}
$("#villaPhotosInput").addEventListener("change",async e=>{const files=[...e.target.files];if(villaPendingPhotos.length+files.length>6){toast("Maximum 6 photos per villa.");e.target.value="";return}for(const file of files){if(!["image/jpeg","image/png","image/webp"].includes(file.type)){toast("Use JPG, PNG, or WEBP images.");continue}try{const data=await compressVillaImage(file);villaPendingPhotos.push(data);renderVillaPhotoPreview()}catch{toast("Could not process one of the images.")}}e.target.value=""});
$("#villaForm").onsubmit=e=>{e.preventDefault();if(!canManageTrip())return toast("Member Access hanya untuk melihat data.");if(!canManageTrip())return toast("Member harus mengirim request melalui My Requests.");const f=e.target,index=$("#villaIndex").value;const v={name:f.elements.name.value.trim(),area:f.elements.area.value.trim(),price:Number(f.elements.price.value||0),guests:f.elements.guests.value,bedrooms:f.elements.bedrooms.value,bathrooms:f.elements.bathrooms.value,status:f.elements.status.value,photos:villaPendingPhotos.slice(0,6),photo:villaPendingPhotos[0]||"",referenceLink:f.elements.referenceLink.value.trim(),description:f.elements.description.value.trim(),facilities:f.elements.facilities.value.trim(),notes:f.elements.notes.value.trim()};if(!v.name)return toast("Villa name is required.");if(!v.photos.length)return toast("Upload at least one villa photo.");const list=trip().stays||(trip().stays=[]);if(index==="")list.push(v);else list[Number(index)]=v;try{save()}catch(err){return toast("Storage penuh. Kurangi jumlah atau ukuran foto.")}$("#villaModal").close();villasPage(trip());toast(index===""?"Villa added":"Villa updated")};
$("#villaPhotoPreview").addEventListener("click",e=>{const b=e.target.closest("[data-remove-villaphoto]");if(!b)return;villaPendingPhotos.splice(Number(b.dataset.removeVillaphoto),1);renderVillaPhotoPreview()});
$('#cancelVilla').onclick=()=>$('#villaModal').close();

let villaGalleryIndex=0,villaGalleryPhotos=[];
function setVillaGallery(index){
 if(!villaGalleryPhotos.length)return;
 villaGalleryIndex=(index+villaGalleryPhotos.length)%villaGalleryPhotos.length;
 const image=document.querySelector("[data-villa-image]");if(image)image.style.backgroundImage=`url("${villaGalleryPhotos[villaGalleryIndex]}")`;
 const count=document.querySelector("[data-villa-count]");if(count)count.textContent=`${villaGalleryIndex+1} / ${villaGalleryPhotos.length}`;
 document.querySelectorAll("[data-villa-dot]").forEach((b,n)=>b.classList.toggle("active",n===villaGalleryIndex));
}

function villaDetail(i){const v=trip().stays[i];if(!v)return;const photos=(v.photos||[]).length?v.photos:[v.photo||'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1400&q=85'];villaGalleryIndex=0;villaGalleryPhotos=photos;const d=$('#villaDetailModal');d.innerHTML=`<div class="villa-detail"><button class="villa-close" onclick="this.closest('dialog').close()">×</button><div class="villa-gallery" data-villa-gallery="${i}">
 <button type="button" class="villa-gallery-arrow prev" data-villa-prev aria-label="Previous photo">‹</button>
 <div class="villa-detail-image" data-villa-image style="background-image:url('${esc(photos[0])}')"></div>
 <button type="button" class="villa-gallery-arrow next" data-villa-next aria-label="Next photo">›</button>
 <div class="villa-gallery-count" data-villa-count>1 / ${photos.length}</div>
 <div class="villa-gallery-dots">${photos.map((_,n)=>`<button type="button" class="villa-gallery-dot ${n===0?"active":""}" data-villa-dot="${n}" aria-label="Photo ${n+1}"></button>`).join("")}</div>
</div><div class="villa-detail-content"><span class="status ${String(v.status||'Available').toLowerCase()}">${esc(v.status||'Available')}</span><h2>${esc(v.name)}</h2><p class="villa-location">⌖ ${esc(v.area||'Location not set')}</p><div class="villa-detail-price">${money(v.price||0)} <small>/ night</small></div><div class="stay-meta"><span>♙ ${esc(v.guests||'—')} Guests</span><span>▤ ${esc(v.bedrooms||'—')} Bedrooms</span><span>▱ ${esc(v.bathrooms||'—')} Bathrooms</span></div><div class="villa-detail-section"><h3>Overview</h3><p>${esc(v.description||'No description added yet.')}</p></div><div class="villa-detail-section"><h3>Facilities</h3><p>${esc(v.facilities||'No facilities listed yet.')}</p></div>${v.notes?`<div class="villa-detail-section"><h3>Personal Notes</h3><p>${esc(v.notes)}</p></div>`:''}<div class="villa-detail-actions">${(v.referenceLink||v.whatsapp)?`<a class="light" target="_blank" rel="noopener noreferrer" href="${esc(v.referenceLink||v.whatsapp)}">Referensi Link ↗</a>`:''}<button class="light" data-editvilla="${i}" onclick="document.getElementById('villaDetailModal').close()">Edit Villa</button><button class="light" data-delvilla="${i}" onclick="document.getElementById('villaDetailModal').close()">Delete</button></div></div></div>`;d.showModal()}

function participantsPage(t){
  if(!Array.isArray(t.participants))t.participants=[];
  const people=t.participants;people.forEach(x=>{if(!x.notes&&x.contact)x.notes=x.contact;});
  const confirmed=people.filter(x=>(x.status||"Confirmed")==="Confirmed").length;
  const rows=people.map((x,i)=>`<tr><td><strong>${esc(x.name||"—")}</strong></td><td>${esc(x.notes||"—")}</td><td>${esc(x.role||"Participant")}</td><td><span class="status ${String(x.status||"Confirmed").toLowerCase()}">${esc(x.status||"Confirmed")}</span></td><td><div class="actions"><button data-editperson="${i}">Edit</button><button data-delperson="${i}">Delete</button></div></td></tr>`).join("");
  $("#content").innerHTML=`<div class="stats people-stats"><div class="stat"><small>Total Participants</small><b>${people.length} People</b></div><div class="stat"><small>Confirmed</small><b>${confirmed} People</b></div><div class="stat"><small>Pending</small><b>${people.filter(x=>(x.status||"")==="Pending").length} People</b></div><div class="stat"><small>Not Joining</small><b>${people.filter(x=>(x.status||"")==="Not Joining").length} People</b></div></div><section class="section"><div class="toolbar"><div><h2>Trip Participants</h2><p>Manage everyone joining ${esc(t.name)}.</p></div><button class="primary" id="addParticipant">＋ Add Participant</button></div><div style="overflow:auto"><table><thead><tr><th>Name</th><th>Notes / To-do</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="empty">No participants yet. Add the first person to this trip.</td></tr>'}</tbody></table></div></section>`;
}
function openParticipant(index=null){
  const t=trip(); const f=$("#participantForm"); f.reset(); $("#participantIndex").value=index===null?"":String(index);
  $("#participantModalTitle").textContent=index===null?"Add Participant":"Edit Participant";
  if(index!==null){const x=t.participants[index]||{};f.elements.name.value=x.name||"";f.elements.role.value=x.role||"Participant";f.elements.status.value=x.status||"Confirmed";f.elements.notes.value=x.notes||"";}
  $("#participantModal").showModal();
}
$("#participantForm").onsubmit=e=>{if(!canManageTrip())return toast("Member harus mengirim request melalui My Requests.");
  e.preventDefault(); if(!canManageTrip())return toast("Member harus mengirim request melalui My Requests.");
  const f=e.target, index=$("#participantIndex").value;
  const item={name:f.elements.name.value.trim(),role:f.elements.role.value,status:f.elements.status.value,notes:f.elements.notes.value.trim()};
  if(!item.name)return toast("Nama peserta wajib diisi.");
  const list=trip().participants||(trip().participants=[]);
  if(index==="")list.push(item);else if(list[Number(index)])list[Number(index)]=item;
  save();$("#participantModal").close();participantsPage(trip());toast(index===""?"Participant added":"Participant updated");
};
$("#cancelParticipant").onclick=()=>$("#participantModal").close();

function hpIcon(name){
 const paths={
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h18M16 14h.01"/>',
 chart:'<path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 5-7"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
 pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 bed:'<path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 14h18M7 9V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3"/>',
 more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19 13.5a7.5 7.5 0 0 0 0-3l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L13.5 2h-3L10 5a8 8 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5a7.5 7.5 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5l.5 3h3l.5-3a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5z"/>',
 income:'<path d="M12 3v18M17 7H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
 back:'<path d="m15 18-6-6 6-6M9 12h12M3 4v16"/>',

 checklist:'<path d="m4 7 2 2 4-4M4 17l2 2 4-4M12 7h8M12 17h8"/>',
 download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
 upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M12 16V3m-5 5 5-5 5 5"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
 moon:'<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>'
 };
 return `<svg class="hp-icon" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.more}</svg>`;
}
function dashboard(t){
 const budget=(t.budget||[]).reduce((a,x)=>a+Number(x.amount||0),0);
 const spent=(t.cashflow||[]).filter(x=>x.type==="Expense").reduce((a,x)=>a+Number(x.amount||0),0);
 const pct=budget?Math.min(100,spent/budget*100):0;
 const next=(t.itinerary||[]).slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))[0];
 $("#content").innerHTML=`<section class="hero" style="background-image:url('${esc(t.cover||"")}')"><span class="pill">TRIP SPACE</span><h2>${esc(t.name)}</h2><p>${date(t.start)} – ${date(t.end)}　·　${esc(t.destination)}</p></section>
 <div class="stats dashboard-stats">
 <div class="stat"><span class="stat-icon">${hpIcon("users")}</span><small>Participants</small><b>${(t.participants||[]).length} People</b></div>
 <div class="stat"><span class="stat-icon">${hpIcon("wallet")}</span><small>Planned Budget</small><b>${money(budget)}</b></div>
 <div class="stat"><span class="stat-icon">${hpIcon("chart")}</span><small>Total Spent</small><b>${money(spent)}</b></div>
 <div class="stat"><span class="stat-icon">${hpIcon("calendar")}</span><small>Remaining</small><b>${money(budget-spent)}</b></div></div>
 <div class="two"><section class="section"><h2>Budget Overview</h2><div class="bar"><i style="width:${pct}%"></i></div><b>${pct.toFixed(1)}%</b><p>Spent ${money(spent)} · Budget ${money(budget)}</p></section><section class="section"><h2>Upcoming Itinerary</h2>${next?`<b>${esc(next.title||next.activity||"")}</b><p>${date(next.date)} · ${esc(next.time||"")} · ${esc(next.place||next.location||"")}</p>`:"No itinerary added yet."}</section></div>
 <section class="section"><div class="toolbar"><h2>Trip Overview</h2>${mode==="master"?'<button id="editTripSettings">Trip Settings</button>':""}</div><div class="actions">${[["General","pin"],["Participants","users"],["Income Planning","chart"],["Expense Planning","wallet"],["Cash Flow","chart"],["Villas & Stay","bed"],["Destinations","pin"],["Itinerary","calendar"]].map(([n,ic])=>`<button data-page="${n}">${hpIcon(ic)}<span>${n}</span></button>`).join("")}</div></section>`;
}
function general(t){
 const ro=mode==="member"?"disabled":"";
 ensurePlans(t);
 $("#content").innerHTML=`<section class="section"><h2>Trip Information</h2><div class="formgrid"><label>Trip name<input id="gName" value="${esc(t.name)}" ${ro}></label><label>Destination<input id="gDestination" value="${esc(t.destination||"")}" ${ro}></label><label>Start date<input id="gStart" type="date" value="${esc(t.start||"")}" ${ro}></label><label>End date<input id="gEnd" type="date" value="${esc(t.end||"")}" ${ro}></label></div>${mode==="member"?"":'<p><button class="primary" id="saveGeneral">Save trip information</button></p>'}</section>
 <section class="section plan-settings"><h2>Plan Settings</h2><p>Atur Plan A dan Plan B untuk membandingkan pemasukan dan pengeluaran. Minimal satu plan harus aktif.</p><div class="plan-settings-grid">${t.plans.map(p=>`<article class="plan-setting-card"><label class="plan-enable"><input type="checkbox" data-plan-enabled="${p.id}" ${p.enabled?"checked":""} ${ro}><span>Enable ${esc(p.name)}</span></label><label>Plan name<input data-plan-name="${p.id}" value="${esc(p.name)}" ${ro}></label><small>${p.enabled?"Available":"Disabled"}</small></article>`).join("")}</div><div class="plan-default-row"><label>Default plan<select id="defaultPlan" ${ro}>${t.plans.filter(p=>p.enabled).map(p=>`<option value="${p.id}" ${p.id===t.activePlanId?"selected":""}>${esc(p.name)}</option>`).join("")}</select></label>${mode==="member"?"":'<button class="primary" id="savePlans">Save plan settings</button>'}</div></section>`;
}
function openTrip(){if(mode!=="master")return;editingTripId=null;$("#tripForm").reset();$("#tripModal").showModal()}
$("#tripForm").onsubmit=async e=>{
 e.preventDefault();
 if(mode!=="master")return toast("Master Access required.");
 const form=e.target, f=Object.fromEntries(new FormData(form));
 if(!/^\d{6}$/.test(f.pin))return toast("Trip PIN harus 6 digit.");
 if(db.trips.some(t=>t.pin===f.pin&&t.id!==editingTripId))return toast("PIN sudah digunakan trip lain.");
 const submit=form.querySelector('button[type="submit"]')||form.querySelector('button.primary');
 if(submit){submit.disabled=true;submit.textContent="Saving…";}
 try{
  if(editingTripId){
   const t=db.trips.find(x=>x.id===editingTripId);
   if(!t)throw new Error("Trip tidak ditemukan.");
   const updated=await window.HolidayPlannerCloud.updateTrip(t.id,{name:f.name,destination:f.destination,start:f.start,end:f.end,cover:f.cover||t.cover||""});
   Object.assign(t,{name:updated.name,destination:updated.destination||"",start:updated.start_date||"",end:updated.end_date||"",cover:updated.cover_image_url||"",pin:f.pin});
  }else{
   const created=await window.HolidayPlannerCloud.createTrip({name:f.name,destination:f.destination,start:f.start,end:f.end,cover:f.cover||""});
   const fresh={...f,id:created.id,name:created.name,destination:created.destination||"",start:created.start_date||"",end:created.end_date||"",cover:created.cover_image_url||"",participants:[],budget:[],cashflow:[],stays:[],destinations:[],itinerary:[]};
   ensurePlans(fresh);db.trips.push(fresh);
  }
  save();$("#tripModal").close();form.reset();editingTripId=null;page="All Trips";showApp();toast("Trip saved to Supabase");
 }catch(error){toast(error.message||"Gagal menyimpan trip ke Supabase.");}
 finally{if(submit){submit.disabled=false;submit.textContent="Create Trip";}}
};
$("#cancelTrip").onclick=()=>$("#tripModal").close();
document.addEventListener("click",async e=>{let b=e.target.closest("button");if(!b)return;
if(b.hasAttribute("data-villa-prev")){setVillaGallery(villaGalleryIndex-1);return;}
if(b.hasAttribute("data-villa-next")){setVillaGallery(villaGalleryIndex+1);return;}
if(b.hasAttribute("data-villa-dot")){setVillaGallery(Number(b.dataset.villaDot));return;}if(b.id==="themeToggle"){togglePlannerTheme();return;}if(b.id==="languageToggle"){togglePlannerLanguage();return;}if(b.dataset.action==="enter-trip"){pendingTripWelcome=false;document.body.classList.remove("trip-welcome-mode");page="Dashboard";render();return}if(b.dataset.action==="exit-trip"){mode="";tripId=null;activeAdmin=null;memberName="";page="All Trips";auth();return}if(b.dataset.page){page=b.dataset.page;document.querySelectorAll("#nav [data-page]").forEach(n=>n.classList.toggle("active",n.dataset.page===page));if(page==="All Trips"){mode="master";tripId=null;pendingTripWelcome=false;document.body.classList.remove("trip-welcome-mode");showApp()}else if(page==="Assigned Trips"){tripId=null;showApp()}else render();return}
if(b.id==="createAdmin"){
 if(mode!=="master")return toast("Master Access required.");
 const name=$("#newAdminName").value.trim(),pin=$("#newAdminPin").value.trim(),trips=[...document.querySelectorAll('input[name="adminTrip"]:checked')].map(o=>o.value);
 if(!name||!/^[0-9]{6}$/.test(pin))return toast("Isi nama dan PIN 6 digit.");
 if(pin===db.admin.pin||db.admins.some(a=>a.pin===pin)||db.trips.some(t=>t.pin===pin))return toast("PIN sudah digunakan.");
 if(!trips.length)return toast("Pilih minimal satu trip untuk Admin ini.");
 try{
  const result=await window.HolidayPlannerCloud.createAdmin(name,pin,trips);
  db.admins=db.admins.filter(a=>a.id!==result.user_id);
  db.admins.push({id:result.user_id,name,trips});
  save();accessManagement();toast("Admin account created.");
 }catch(error){
  toast(error?.message||"Gagal membuat Admin.");
 }
}
if(b.dataset.removeadmin){if(mode!=="master")return;db.admins=db.admins.filter(a=>a.id!==b.dataset.removeadmin);save();accessManagement();toast("Admin removed.");}


if(isMemberViewOnly() && (b.id==="newTrip" || b.id==="addParticipant" || b.id==="addBudget" || b.id==="addCashflow" || b.id==="addVilla" || b.id==="addDestination" || b.id==="addItinerary"))return toast("Member Access hanya untuk melihat data.");
if(b.id==="newTrip")openTrip();if(b.dataset.open){tripId=b.dataset.open;if(mode==="master"||assignedTrips().some(t=>t.id===tripId)){page="Dashboard";pendingTripWelcome=true;showApp()}else toast("Trip access denied.")}if(b.dataset.edittrip){let t=db.trips.find(x=>x.id===b.dataset.edittrip);if(t){editingTripId=t.id;let f=$("#tripForm");f.elements.name.value=t.name;f.elements.destination.value=t.destination;f.elements.start.value=t.start;f.elements.end.value=t.end;f.elements.pin.value=t.pin||"";f.elements.cover.value=t.cover||"";$("#tripModal").showModal();}}if(b.dataset.deltrip){if(confirm("Delete this trip and all its data?")){const id=b.dataset.deltrip;try{await window.HolidayPlannerCloud.deleteTrip(id);db.trips=db.trips.filter(t=>t.id!==id);if(db.cloudTripMap)for(const k of Object.keys(db.cloudTripMap))if(db.cloudTripMap[k]===id)delete db.cloudTripMap[k];save();render();toast("Trip deleted from Supabase")}catch(error){toast(error.message||"Gagal menghapus trip.")}}}if(b.id==="saveAdmin"){let p=$("#adminPin").value;if(p&&!/^\d{6}$/.test(p))return toast("Master PIN harus 6 digit.");db.admin.name=$("#adminName").value||"Fiqi Naufaldy";if(p)db.admin.pin=p;save();updateSidebarProfile();settings();toast("Settings saved")}if(b.id==="export"){let payload,filename;if(mode==="admin"){const a=db.admins.find(x=>x.id===activeAdmin);if(!a)return toast("Admin account not found.");payload={app:"Holiday Planner",format:"holiday-planner-backup",version:2,scope:"admin-assigned",adminId:activeAdmin,createdAt:new Date().toISOString(),trips:assignedTrips()};filename="holiday-planner-admin-backup.json";}else{payload={app:"Holiday Planner",format:"holiday-planner-backup",version:2,scope:"master-full",createdAt:new Date().toISOString(),...db};filename="holiday-planner-master-backup.json";}const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a"),url=URL.createObjectURL(blob);a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}if(b.id==="import")$("#backupFile").click();if(b.id==="saveGeneral"){
 const t=trip();if(!canManageTrip())return toast("Member Access hanya untuk melihat data.");
 t.name=$("#gName").value.trim()||t.name;
 t.destination=$("#gDestination").value.trim();t.start=$("#gStart").value;t.end=$("#gEnd").value;
 ensurePlans(t);t.plans.forEach(p=>p.tripInfo={destination:t.destination,start:t.start,end:t.end});
 save();general(t);toast("Trip information saved");
}if(b.id==="savePlans"){const t=trip();ensurePlans(t);const checks=[...document.querySelectorAll("[data-plan-enabled]")];if(!checks.some(x=>x.checked))return toast("Minimal satu plan harus aktif.");t.plans.forEach(p=>{p.enabled=!!document.querySelector(`[data-plan-enabled="${p.id}"]`)?.checked;const n=document.querySelector(`[data-plan-name="${p.id}"]`);if(n&&n.value.trim())p.name=n.value.trim()});const def=$("#defaultPlan").value;if(t.plans.some(p=>p.id===def&&p.enabled))t.activePlanId=def;activatePlan(t,t.activePlanId);save();general(t);toast("Plan settings saved")}if(b.id==="editTripSettings")toast("Trip settings editor is next development step");if(b.id==="planningAdd")openPlanningForm(b.dataset.kind);if(b.dataset.planEdit){const [k,i]=b.dataset.planEdit.split(":");openPlanningForm(k,Number(i));}if(b.dataset.planDelete){const [k,i]=b.dataset.planDelete.split(":");if(confirm("Delete this item?")){const t=trip();if(!Array.isArray(t[k]))t[k]=[];t[k].splice(Number(i),1);save();planningCollectionPage(t,k);}}if(b.id==="cashflowAdd")openCashFlowForm();if(b.dataset.cfEdit!==undefined){const [pid,ix]=b.dataset.cfEdit.split(":");if(pid!=="legacy"){const t=trip();t.activePlanId=pid;openCashFlowForm(Number(ix));}}if(b.dataset.cfDelete!==undefined){const [pid,ix]=b.dataset.cfDelete.split(":");const t=trip();if(confirm("Hapus transaksi ini?")){if(pid==="legacy")t.cashflow.splice(Number(ix),1);else{const p=t.plans.find(p=>p.id===pid);p?.cashflow?.splice(Number(ix),1);}save();cashFlowPage(t);}}if(b.id==="addItem")toast("Form input module is next development step");if(b.id==="addParticipant")openParticipant();if(b.id==="addBudget")openBudget();if(b.id==="addIncome")openIncome();if(b.dataset.editincome!==undefined)openIncome(Number(b.dataset.editincome));if(b.dataset.delincome!==undefined){const i=Number(b.dataset.delincome);if(confirm("Delete this income item?")){const t=trip();const item=t.income[i];if(item?.cashflowId)t.cashflow=(t.cashflow||[]).filter(x=>x.incomeId!==item.cashflowId&&x.id!==item.cashflowId);t.income.splice(i,1);const p=t.plans?.find(x=>x.id===t.activePlanId);if(p){p.income=t.income;p.cashflow=t.cashflow;}save();incomePage(t);}}if(b.dataset.switchPlan){const t=trip();const target=b.dataset.switchPlan;const dest=page;if(activatePlan(t,target)){page=dest;render()}}if(b.id==="addVilla"||b.id==="addVillaEmpty")openVilla();if(b.dataset.editvilla!==undefined)openVilla(Number(b.dataset.editvilla));if(b.dataset.villadetail!==undefined)villaDetail(Number(b.dataset.villadetail));if(b.dataset.delvilla!==undefined){const i=Number(b.dataset.delvilla);if(confirm("Delete this villa?")){trip().stays.splice(i,1);save();villasPage(trip());toast("Villa deleted")}}if(b.dataset.editbudget!==undefined)openBudget(Number(b.dataset.editbudget));if(b.dataset.delbudget!==undefined){const i=Number(b.dataset.delbudget);if(confirm("Delete this budget item?")){trip().budget.splice(i,1);save();budgetPage(trip());toast("Budget item deleted")}}if(b.dataset.editperson!==undefined)openParticipant(Number(b.dataset.editperson));if(b.dataset.delperson!==undefined){const i=Number(b.dataset.delperson);if(confirm("Remove this participant from the trip?")){trip().participants.splice(i,1);save();participantsPage(trip());toast("Participant removed")}}if(b.dataset.delitem){let [key,i]=b.dataset.delitem.split(":");if(confirm("Delete this item?")){trip()[key].splice(+i,1);save();render()}}});
document.addEventListener("change",e=>{if(e.target.id==="dashboardPlan"){const t=trip();if(activatePlan(t,e.target.value)){page="Dashboard";render()}return}if(e.target.id==="profilePhoto"&&e.target.files&&e.target.files[0]){if(mode!=="master")return toast("Master Access required.");const file=e.target.files[0];if(!["image/jpeg","image/png","image/webp"].includes(file.type))return toast("Use JPG, PNG, or WEBP.");if(file.size>2*1024*1024)return toast("Maximum photo size is 2 MB.");const reader=new FileReader();reader.onload=()=>{db.admin.photo=reader.result;save();updateSidebarProfile();settings();toast("Profile photo updated")};reader.readAsDataURL(file);}});
$("#backupFile").onchange=async e=>{try{const file=e.target.files&&e.target.files[0];if(!file)return;const x=JSON.parse(await file.text());if(x.app!=="Holiday Planner"||!Array.isArray(x.trips))throw new Error("Invalid backup file");if(mode==="admin"){if(x.scope!=="admin-assigned"||x.adminId!==activeAdmin)throw new Error("Backup ini bukan milik akun Admin yang sedang digunakan.");const allowed=new Set(assignedTrips().map(t=>t.id));if(!x.trips.every(t=>t&&typeof t.id==="string"&&allowed.has(t.id)))throw new Error("Backup berisi trip yang tidak ditugaskan ke akun ini.");if(!confirm("Restore backup untuk trip yang ditugaskan ke akun Admin ini? Data trip tersebut akan diganti."))return;const incoming=new Map(x.trips.map(t=>[t.id,t]));db.trips=db.trips.map(t=>incoming.has(t.id)?incoming.get(t.id):t);save();showApp();toast("Admin trip backup restored")}else if(mode==="master"){if(x.scope!=="master-full"||!x.admin||!Array.isArray(x.admins))throw new Error("Gunakan backup Master lengkap untuk restore di Master Access.");if(!confirm("Restore full backup? Seluruh data lokal saat ini akan diganti."))return;const restored={...x};delete restored.app;delete restored.format;delete restored.version;delete restored.scope;delete restored.createdAt;db=restored;save();mode="master";tripId=null;activeAdmin=null;page="All Trips";showApp();toast("Full backup restored")}else throw new Error("Access denied.")}catch(err){toast(err.message||"Invalid backup file")}e.target.value=""};
if($("#lock"))$("#lock").onclick=auth;$("#brandHome").onclick=e=>{e.preventDefault();if(mode==="master"){page="All Trips";render()}};
auth();
// Translate newly rendered UI after user interactions without observing DOM mutations.
})();
let villaTouchStartX=0;
document.addEventListener("touchstart",e=>{if(e.target.closest(".villa-gallery"))villaTouchStartX=e.changedTouches[0].clientX;},{passive:true});
document.addEventListener("touchend",e=>{if(!e.target.closest(".villa-gallery"))return;const dx=e.changedTouches[0].clientX-villaTouchStartX;if(Math.abs(dx)>35)setVillaGallery(villaGalleryIndex+(dx<0?1:-1));},{passive:true});


