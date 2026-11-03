<?php
if (!defined('ABSPATH')) exit;
class Planner_API {
 private static $instance=null;
 public static function instance(){ if(self::$instance===null) self::$instance=new self(); return self::$instance; }
 private function trips(){ global $wpdb; return $wpdb->prefix.'planner_trips'; }
 private function access(){ global $wpdb; return $wpdb->prefix.'planner_trip_access'; }
 private function items(){ global $wpdb; return $wpdb->prefix.'planner_trip_items'; }
 public static function activate(){
  global $wpdb; require_once ABSPATH.'wp-admin/includes/upgrade.php'; $c=$wpdb->get_charset_collate();
  $tr=$wpdb->prefix.'planner_trips'; $ac=$wpdb->prefix.'planner_trip_access'; $it=$wpdb->prefix.'planner_trip_items';
  dbDelta("CREATE TABLE $tr (id bigint(20) unsigned NOT NULL AUTO_INCREMENT, slug varchar(100) NOT NULL, name varchar(190) NOT NULL, destination varchar(190) NOT NULL DEFAULT '', start_date date NULL, end_date date NULL, cover text NULL, status varchar(20) NOT NULL DEFAULT 'active', created_at datetime NOT NULL, updated_at datetime NOT NULL, PRIMARY KEY  (id), UNIQUE KEY slug (slug)) $c;");
  dbDelta("CREATE TABLE $ac (id bigint(20) unsigned NOT NULL AUTO_INCREMENT, trip_id bigint(20) unsigned NOT NULL, pin_hash varchar(255) NOT NULL, enabled tinyint(1) NOT NULL DEFAULT 1, updated_at datetime NOT NULL, PRIMARY KEY  (id), UNIQUE KEY trip_id (trip_id)) $c;");
  dbDelta("CREATE TABLE $it (id bigint(20) unsigned NOT NULL AUTO_INCREMENT, trip_id bigint(20) unsigned NOT NULL, item_type varchar(40) NOT NULL, title varchar(190) NOT NULL DEFAULT '', data longtext NOT NULL, created_at datetime NOT NULL, updated_at datetime NOT NULL, PRIMARY KEY  (id), KEY trip_type (trip_id,item_type)) $c;");
  // Initialize Master PIN and starter trips only once. PINs are stored as password hashes.
  if (!get_option('planner_admin_pin_hash')) {
   add_option('planner_admin_pin_hash', wp_hash_password('240225'));
  }
  $existing=(int)$wpdb->get_var("SELECT COUNT(*) FROM $tr");
  if ($existing===0) {
   $now=current_time('mysql');
   $starter=[
    ['slug'=>'batu-escape','name'=>'Batu Escape','destination'=>'Batu, Malang, Jawa Timur','start_date'=>'2026-12-12','end_date'=>'2026-12-13','pin'=>'262626','cover'=>''],
    ['slug'=>'bali-getaway','name'=>'Bali Getaway','destination'=>'Bali, Indonesia','start_date'=>'2027-01-15','end_date'=>'2027-01-18','pin'=>'000000','cover'=>'']
   ];
   foreach($starter as $trip){
    $wpdb->insert($tr,['slug'=>$trip['slug'],'name'=>$trip['name'],'destination'=>$trip['destination'],'start_date'=>$trip['start_date'],'end_date'=>$trip['end_date'],'cover'=>$trip['cover'],'status'=>'active','created_at'=>$now,'updated_at'=>$now]);
    $trip_id=(int)$wpdb->insert_id;
    if($trip_id){$wpdb->insert($ac,['trip_id'=>$trip_id,'pin_hash'=>wp_hash_password($trip['pin']),'enabled'=>1,'updated_at'=>$now]);}
   }
  }
 }
 private function __construct(){ add_action('rest_api_init',[$this,'routes']); add_action('rest_api_init',[$this,'cors'],1); add_action('admin_menu',[$this,'menu']); }
 public function cors(){
  $allowed=defined('PLANNER_ALLOWED_ORIGIN')?PLANNER_ALLOWED_ORIGIN:''; $origin=get_http_origin();
  if($allowed && $origin && hash_equals(rtrim($allowed,'/'),rtrim($origin,'/'))){
   header('Access-Control-Allow-Origin: '.$allowed); header('Vary: Origin',false);
   header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
   header('Access-Control-Allow-Headers: Content-Type, X-Planner-Token');
  }
 }
 public function routes(){
  register_rest_route('planner/v1','/admin/unlock',['methods'=>'POST','callback'=>[$this,'admin_unlock'],'permission_callback'=>'__return_true']);
  register_rest_route('planner/v1','/trips',['methods'=>'GET','callback'=>[$this,'list_trips'],'permission_callback'=>[$this,'is_admin']]);
  register_rest_route('planner/v1','/trips',['methods'=>'POST','callback'=>[$this,'create_trip'],'permission_callback'=>[$this,'is_admin']]);
  register_rest_route('planner/v1','/trips/(?P<id>\d+)',['methods'=>'PUT','callback'=>[$this,'update_trip'],'permission_callback'=>[$this,'is_admin']]);
  register_rest_route('planner/v1','/trips/(?P<id>\d+)',['methods'=>'DELETE','callback'=>[$this,'delete_trip'],'permission_callback'=>[$this,'is_admin']]);
  register_rest_route('planner/v1','/trip/unlock',['methods'=>'POST','callback'=>[$this,'trip_unlock'],'permission_callback'=>'__return_true']);
  register_rest_route('planner/v1','/trip/(?P<id>\d+)/items',['methods'=>'GET','callback'=>[$this,'list_items'],'permission_callback'=>[$this,'is_trip']]);
  register_rest_route('planner/v1','/trip/(?P<id>\d+)/items',['methods'=>'POST','callback'=>[$this,'create_item'],'permission_callback'=>[$this,'is_trip']]);
  register_rest_route('planner/v1','/trip/(?P<id>\d+)/items/(?P<item>\d+)',['methods'=>'PUT','callback'=>[$this,'update_item'],'permission_callback'=>[$this,'is_trip']]);
  register_rest_route('planner/v1','/trip/(?P<id>\d+)/items/(?P<item>\d+)',['methods'=>'DELETE','callback'=>[$this,'delete_item'],'permission_callback'=>[$this,'is_trip']]);
 }
 private function token($r){ return (string)$r->get_header('X-Planner-Token'); }
 public function is_admin($r){ $t=$this->token($r); return $t && get_transient('planner_master_'.hash('sha256',$t)) ? true : new WP_Error('planner_forbidden','Master access required.', ['status'=>403]); }
 public function is_trip($r){ $t=$this->token($r); $id=absint($r['id']); return $t && get_transient('planner_trip_'.$id.'_'.hash('sha256',$t)) ? true : new WP_Error('planner_forbidden','Trip access required.', ['status'=>403]); }
 public function admin_unlock($r){
  $hash=get_option('planner_admin_pin_hash',''); $pin=(string)$r->get_param('pin');
  if(!$hash) return new WP_Error('planner_pin_unset','Set Master PIN in WordPress Settings → Planner API first.',['status'=>400]);
  if(!$pin || !wp_check_password($pin,$hash)) return new WP_Error('planner_pin_invalid','PIN tidak sesuai.',['status'=>401]);
  $token=wp_generate_password(48,false,false); set_transient('planner_master_'.hash('sha256',$token),1,2*HOUR_IN_SECONDS);
  return rest_ensure_response(['token'=>$token,'role'=>'master','expires_in'=>7200]);
 }
 public function trip_unlock($r){
  global $wpdb; $pin=(string)$r->get_param('pin');
  if(!preg_match('/^[0-9]{6,12}$/',$pin)) return new WP_Error('planner_pin_invalid','PIN harus 6–12 digit.',['status'=>400]);
  $rows=$wpdb->get_results("SELECT t.id,a.pin_hash FROM ".$this->trips()." t INNER JOIN ".$this->access()." a ON a.trip_id=t.id WHERE t.status='active' AND a.enabled=1",ARRAY_A);
  foreach($rows as $row){ if(wp_check_password($pin,$row['pin_hash'])){ $token=wp_generate_password(48,false,false); set_transient('planner_trip_'.(int)$row['id'].'_'.hash('sha256',$token),1,2*HOUR_IN_SECONDS); return rest_ensure_response(['token'=>$token,'role'=>'trip','trip_id'=>(int)$row['id'],'expires_in'=>7200]); } }
  return new WP_Error('planner_pin_invalid','PIN tidak sesuai.',['status'=>401]);
 }
 public function list_trips(){ global $wpdb; return rest_ensure_response($wpdb->get_results("SELECT id,slug,name,destination,start_date,end_date,cover,status FROM ".$this->trips()." ORDER BY id DESC",ARRAY_A)); }
 public function create_trip($r){
  global $wpdb; $name=sanitize_text_field((string)$r->get_param('name')); $pin=(string)$r->get_param('pin');
  if(!$name || !preg_match('/^[0-9]{6,12}$/',$pin)) return new WP_Error('planner_trip_data','Nama trip dan PIN 6–12 digit wajib diisi.',['status'=>400]);
  $slug=sanitize_title((string)($r->get_param('slug')?:$name)); if(!$slug)$slug='trip-'.wp_generate_password(6,false,false);
  $now=current_time('mysql'); $ok=$wpdb->insert($this->trips(),['slug'=>$slug,'name'=>$name,'destination'=>sanitize_text_field((string)$r->get_param('destination')),'start_date'=>$r->get_param('start_date')?:null,'end_date'=>$r->get_param('end_date')?:null,'cover'=>esc_url_raw((string)$r->get_param('cover')),'status'=>'active','created_at'=>$now,'updated_at'=>$now]);
  if(!$ok)return new WP_Error('planner_db','Gagal membuat trip. Pastikan slug unik.',['status'=>500]);
  $id=(int)$wpdb->insert_id; $wpdb->insert($this->access(),['trip_id'=>$id,'pin_hash'=>wp_hash_password($pin),'enabled'=>1,'updated_at'=>$now]);
  return rest_ensure_response(['id'=>$id,'message'=>'Trip dibuat dan PIN tersimpan sebagai hash.']);
 }
 public function update_trip($r){
  global $wpdb; $id=absint($r['id']); $data=[];
  foreach(['name','destination','status'] as $k){ if($r->has_param($k))$data[$k]=$k==='status'?sanitize_key($r->get_param($k)):sanitize_text_field($r->get_param($k)); }
  foreach(['start_date','end_date'] as $k){if($r->has_param($k))$data[$k]=$r->get_param($k)?:null;}
  if($r->has_param('cover'))$data['cover']=esc_url_raw((string)$r->get_param('cover'));
  if($data){$data['updated_at']=current_time('mysql');$wpdb->update($this->trips(),$data,['id'=>$id]);}
  if($r->has_param('pin') && (string)$r->get_param('pin')!==''){
   $pin=(string)$r->get_param('pin'); if(!preg_match('/^[0-9]{6,12}$/',$pin))return new WP_Error('planner_pin_invalid','PIN harus 6–12 digit.',['status'=>400]);
   $wpdb->replace($this->access(),['trip_id'=>$id,'pin_hash'=>wp_hash_password($pin),'enabled'=>1,'updated_at'=>current_time('mysql')]);
  }
  if($r->has_param('pin_enabled'))$wpdb->update($this->access(),['enabled'=>$r->get_param('pin_enabled')?1:0,'updated_at'=>current_time('mysql')],['trip_id'=>$id]);
  return rest_ensure_response(['message'=>'Trip diperbarui.']);
 }
 public function delete_trip($r){global $wpdb;$id=absint($r['id']);$wpdb->delete($this->items(),['trip_id'=>$id],['%d']);$wpdb->delete($this->access(),['trip_id'=>$id],['%d']);$wpdb->delete($this->trips(),['id'=>$id],['%d']);return rest_ensure_response(['message'=>'Trip dan datanya dihapus.']);}
 private function valid_type($type){return in_array(sanitize_key($type),['general','participants','budget','cashflow','villas','destinations','itinerary'],true);}
 public function list_items($r){global $wpdb;$id=absint($r['id']);$type=sanitize_key((string)$r->get_param('type'));$sql="SELECT id,item_type,title,data,created_at,updated_at FROM ".$this->items()." WHERE trip_id=%d";$args=[$id];if($type&&$this->valid_type($type)){$sql.=" AND item_type=%s";$args[]=$type;}$rows=$wpdb->get_results($wpdb->prepare($sql.' ORDER BY id DESC',$args),ARRAY_A);foreach($rows as &$v)$v['data']=json_decode($v['data'],true);return rest_ensure_response($rows);}
 public function create_item($r){global $wpdb;$id=absint($r['id']);$type=sanitize_key((string)$r->get_param('type'));$data=$r->get_param('data');if(!$this->valid_type($type)||!is_array($data))return new WP_Error('planner_item','Data tidak valid.',['status'=>400]);$now=current_time('mysql');$wpdb->insert($this->items(),['trip_id'=>$id,'item_type'=>$type,'title'=>sanitize_text_field((string)$r->get_param('title')),'data'=>wp_json_encode($data),'created_at'=>$now,'updated_at'=>$now]);return rest_ensure_response(['id'=>(int)$wpdb->insert_id]);}
 public function update_item($r){global $wpdb;$id=absint($r['id']);$item=absint($r['item']);$data=$r->get_param('data');if(!is_array($data))return new WP_Error('planner_item','Data tidak valid.',['status'=>400]);$wpdb->update($this->items(),['title'=>sanitize_text_field((string)$r->get_param('title')),'data'=>wp_json_encode($data),'updated_at'=>current_time('mysql')],['id'=>$item,'trip_id'=>$id]);return rest_ensure_response(['message'=>'Data diperbarui.']);}
 public function delete_item($r){global $wpdb;$wpdb->delete($this->items(),['id'=>absint($r['item']),'trip_id'=>absint($r['id'])],['%d','%d']);return rest_ensure_response(['message'=>'Data dihapus.']);}
 public function menu(){add_options_page('Planner API','Planner API','manage_options','planner-api',[$this,'settings']);}
 public function settings(){if(!current_user_can('manage_options'))return;if(isset($_POST['planner_save'])&&check_admin_referer('planner_pin_save')){$pin=trim((string)wp_unslash($_POST['admin_pin']));if(preg_match('/^[0-9]{6,12}$/',$pin)){update_option('planner_admin_pin_hash',wp_hash_password($pin));echo '<div class="notice notice-success"><p>Master PIN berhasil disimpan.</p></div>';}else echo '<div class="notice notice-error"><p>PIN harus 6–12 digit.</p></div>';}echo '<div class="wrap"><h1>Planner API</h1><p>Master PIN untuk akses administrator. Trip PIN dikelola dari Master Access aplikasi.</p><form method="post">';wp_nonce_field('planner_pin_save');echo '<p><input type="password" name="admin_pin" minlength="6" maxlength="12" pattern="[0-9]{6,12}" placeholder="Master PIN 6–12 digit" required></p>';submit_button('Save Master PIN','primary','planner_save');echo '</form></div>';}
}
