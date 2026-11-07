-- Holiday Planner Supabase schema v1
-- Run in Supabase Dashboard > SQL Editor > New query.
-- Auth identities are managed by Supabase Auth. Never store plaintext PINs.
-- PIN verification must be implemented server-side; do not expose pin_hash.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('master','admin','member');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.plan_type as enum ('A','B');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.item_status as enum ('planned','received','paid','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'member',
  pin_hash text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id,display_name,role)
  values(new.id,coalesce(new.raw_user_meta_data ->> 'display_name',new.email,'Member'),'member')
  on conflict(id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination text,
  start_date date,
  end_date date,
  description text,
  cover_image_url text,
  status text not null default 'planning' check(status in ('planning','ongoing','completed','archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.trip_access (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  access_role public.app_role not null check(access_role in ('admin','member')),
  created_at timestamptz not null default now(),
  unique(trip_id,user_id)
);

create table if not exists public.trip_settings (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  currency_code text not null default 'IDR',
  language text not null default 'id' check(language in ('id','en')),
  plan_a_name text not null default 'Plan A',
  plan_b_name text not null default 'Plan B',
  plan_a_active boolean not null default true,
  plan_b_active boolean not null default true,
  default_plan public.plan_type not null default 'A',
  updated_at timestamptz not null default now(),
  check(plan_a_active or plan_b_active)
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.participant_todos (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  address text,
  description text,
  maps_url text,
  image_url text,
  visit_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.villas (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  address text,
  description text,
  reference_link text,
  price numeric(14,2) check(price is null or price >= 0),
  check_in timestamptz,
  check_out timestamptz,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.villa_photos (
  id uuid primary key default gen_random_uuid(),
  villa_id uuid not null references public.villas(id) on delete cascade,
  storage_path text not null,
  public_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  destination_id uuid references public.destinations(id) on delete set null,
  title text not null,
  description text,
  item_date date,
  start_time time,
  end_time time,
  location text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(end_time is null or start_time is null or end_time >= start_time)
);

create table if not exists public.income_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  plan public.plan_type not null,
  title text not null,
  category text,
  amount numeric(14,2) not null default 0 check(amount >= 0),
  status public.item_status not null default 'planned',
  received_at timestamptz,
  notes text,
  transaction_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.expense_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  plan public.plan_type not null,
  title text not null,
  category text,
  amount numeric(14,2) not null default 0 check(amount >= 0),
  status public.item_status not null default 'planned',
  paid_at timestamptz,
  notes text,
  transaction_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id bigint generated always as identity primary key,
  trip_id uuid references public.trips(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_trip_access_user on public.trip_access(user_id);
create index if not exists idx_participants_trip on public.participants(trip_id);
create index if not exists idx_destinations_trip on public.destinations(trip_id);
create index if not exists idx_villas_trip on public.villas(trip_id);
create index if not exists idx_itinerary_trip_date on public.itinerary_items(trip_id,item_date);
create index if not exists idx_income_trip_plan on public.income_items(trip_id,plan);
create index if not exists idx_expense_trip_plan on public.expense_items(trip_id,plan);
create index if not exists idx_activity_trip_created on public.activity_logs(trip_id,created_at desc);

create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = ''
as $$ select p.role from public.profiles p where p.id=(select auth.uid()) and p.is_active=true limit 1 $$;

create or replace function public.is_master()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_app_role()='master'::public.app_role,false) $$;

create or replace function public.has_trip_access(target_trip_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
 select public.is_master() or exists(
   select 1 from public.trip_access a join public.profiles p on p.id=a.user_id
   where a.trip_id=target_trip_id and a.user_id=(select auth.uid()) and p.is_active=true
 )
$$;

create or replace function public.can_manage_trip(target_trip_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
 select public.is_master() or exists(
   select 1 from public.trip_access a join public.profiles p on p.id=a.user_id
   where a.trip_id=target_trip_id and a.user_id=(select auth.uid())
     and a.access_role='admin'::public.app_role and p.is_active=true
 )
$$;

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_access enable row level security;
alter table public.trip_settings enable row level security;
alter table public.participants enable row level security;
alter table public.participant_todos enable row level security;
alter table public.destinations enable row level security;
alter table public.villas enable row level security;
alter table public.villa_photos enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.income_items enable row level security;
alter table public.expense_items enable row level security;
alter table public.activity_logs enable row level security;

-- Profile: self can read own record; Master can read all.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
using(id=(select auth.uid()) or public.is_master());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
using(id=(select auth.uid()) or public.is_master())
with check(public.is_master() or (id=(select auth.uid()) and role='member'::public.app_role));
drop policy if exists profiles_master_insert on public.profiles;
create policy profiles_master_insert on public.profiles for insert to authenticated
with check(public.is_master());

-- Trips: Master creates/deletes; Master or assigned Admin updates.
drop policy if exists trips_read on public.trips;
create policy trips_read on public.trips for select to authenticated using(public.has_trip_access(id));
drop policy if exists trips_create on public.trips;
create policy trips_create on public.trips for insert to authenticated with check(public.is_master());
drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips for update to authenticated
using(public.can_manage_trip(id)) with check(public.can_manage_trip(id));
drop policy if exists trips_delete on public.trips;
create policy trips_delete on public.trips for delete to authenticated using(public.is_master());

-- Assignments: Master only can manage; user can see own assignment.
drop policy if exists trip_access_read on public.trip_access;
create policy trip_access_read on public.trip_access for select to authenticated
using(user_id=(select auth.uid()) or public.is_master());
drop policy if exists trip_access_master_manage on public.trip_access;
create policy trip_access_master_manage on public.trip_access for all to authenticated
using(public.is_master()) with check(public.is_master());

-- Reusable policies for trip-scoped tables.
do $$
declare tbl text;
begin
 foreach tbl in array array['trip_settings','participants','destinations','villas','itinerary_items','income_items','expense_items'] loop
   execute format('drop policy if exists %I on public.%I',tbl||'_read',tbl);
   execute format('create policy %I on public.%I for select to authenticated using(public.has_trip_access(trip_id))',tbl||'_read',tbl);
   execute format('drop policy if exists %I on public.%I',tbl||'_manage',tbl);
   execute format('create policy %I on public.%I for all to authenticated using(public.can_manage_trip(trip_id)) with check(public.can_manage_trip(trip_id))',tbl||'_manage',tbl);
 end loop;
end $$;

-- Child rows inherit access from their parent participant/villa.
drop policy if exists participant_todos_read on public.participant_todos;
create policy participant_todos_read on public.participant_todos for select to authenticated
using(exists(select 1 from public.participants p where p.id=participant_id and public.has_trip_access(p.trip_id)));
drop policy if exists participant_todos_manage on public.participant_todos;
create policy participant_todos_manage on public.participant_todos for all to authenticated
using(exists(select 1 from public.participants p where p.id=participant_id and public.can_manage_trip(p.trip_id)))
with check(exists(select 1 from public.participants p where p.id=participant_id and public.can_manage_trip(p.trip_id)));

drop policy if exists villa_photos_read on public.villa_photos;
create policy villa_photos_read on public.villa_photos for select to authenticated
using(exists(select 1 from public.villas v where v.id=villa_id and public.has_trip_access(v.trip_id)));
drop policy if exists villa_photos_manage on public.villa_photos;
create policy villa_photos_manage on public.villa_photos for all to authenticated
using(exists(select 1 from public.villas v where v.id=villa_id and public.can_manage_trip(v.trip_id)))
with check(exists(select 1 from public.villas v where v.id=villa_id and public.can_manage_trip(v.trip_id)));

drop policy if exists activity_logs_read on public.activity_logs;
create policy activity_logs_read on public.activity_logs for select to authenticated
using((trip_id is null and public.is_master()) or (trip_id is not null and public.has_trip_access(trip_id)));
drop policy if exists activity_logs_add on public.activity_logs;
create policy activity_logs_add on public.activity_logs for insert to authenticated
with check(actor_id=(select auth.uid()) and (public.is_master() or (trip_id is not null and public.can_manage_trip(trip_id))));

-- updated_at automation
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at=now(); return new; end $$;

do $$
declare tbl text;
begin
 foreach tbl in array array['profiles','trips','trip_settings','participants','participant_todos','destinations','villas','itinerary_items','income_items','expense_items'] loop
   execute format('drop trigger if exists set_updated_at on public.%I',tbl);
   execute format('create trigger set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()',tbl);
 end loop;
end $$;

-- Private storage bucket for villa photos (max 10 MB each).
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('holiday-planner','holiday-planner',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

-- AFTER your first signup, promote your account to Master:
-- update public.profiles set role='master' where id='YOUR_AUTH_USER_UUID';
-- Get UUID from Authentication > Users.
-- Then create trips and assign Admin/Member through public.trip_access.
-- Storage object policies are intentionally deferred until app auth/path rules are finalized.

-- ============================================================
-- Member PIN management
-- PIN remains stored only as a bcrypt hash in public.profiles.pin_hash.
-- Master can manage any Member; an Admin can manage Members assigned
-- to a trip that the Admin is allowed to manage.
-- ============================================================

create or replace function public.get_trip_members(p_trip_id uuid)
returns table(
  user_id uuid,
  display_name text,
  role public.app_role,
  is_active boolean,
  pin_configured boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_master() and not public.can_manage_trip(p_trip_id) then
    raise exception 'Akses ditolak.';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.role,
    p.is_active,
    (p.pin_hash is not null and p.pin_hash <> '') as pin_configured
  from public.trip_access a
  join public.profiles p on p.id = a.user_id
  where a.trip_id = p_trip_id
    and a.access_role = 'member'::public.app_role
  order by p.display_name nulls last, p.created_at;
end;
$$;

create or replace function public.set_member_pin(
  p_trip_id uuid,
  p_user_id uuid,
  p_pin text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role public.app_role;
begin
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then
    raise exception 'PIN Member harus terdiri dari 6 digit.';
  end if;

  if not public.is_master() and not public.can_manage_trip(p_trip_id) then
    raise exception 'Akses ditolak.';
  end if;

  select role into target_role
  from public.profiles
  where id = p_user_id
    and is_active = true;

  if target_role is null then
    raise exception 'Member tidak ditemukan atau tidak aktif.';
  end if;

  if target_role <> 'member'::public.app_role then
    raise exception 'Akun yang dipilih bukan Member.';
  end if;

  if not exists (
    select 1
    from public.trip_access a
    where a.trip_id = p_trip_id
      and a.user_id = p_user_id
      and a.access_role = 'member'::public.app_role
  ) then
    raise exception 'Member tidak ditugaskan ke trip ini.';
  end if;

  update public.profiles
  set pin_hash = crypt(p_pin, gen_salt('bf')),
      updated_at = now()
  where id = p_user_id;

  return true;
end;
$$;

grant execute on function public.get_trip_members(uuid) to authenticated;
grant execute on function public.set_member_pin(uuid,uuid,text) to authenticated;
