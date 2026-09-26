-- ============================================================
-- ParkSync — Supabase Schema Migration
-- Run this in your Supabase SQL editor (park-hackathon project)
-- ============================================================

-- 1. Enable UUID extension
create extension if not exists "pgcrypto";

-- 2. Parking Areas
create table if not exists parking_areas (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz default now()
);

-- 3. Parking Slots
create table if not exists parking_slots (
  id          uuid primary key default gen_random_uuid(),
  slot_number text not null,
  area_id     uuid not null references parking_areas(id) on delete cascade,
  slot_type   text not null default 'Car' check (slot_type in ('Car','Bike','EV')),
  is_active   boolean not null default true,
  created_at  timestamptz default now(),
  unique (area_id, slot_number)
);

create index if not exists idx_slots_area on parking_slots(area_id);

-- 4. Bookings
create table if not exists bookings (
  id              uuid primary key default gen_random_uuid(),
  booking_code    text unique not null,
  demo_user_name  text not null default 'John Smith',
  demo_user_role  text not null default 'Student',
  slot_id         uuid not null references parking_slots(id) on delete restrict,
  start_time      timestamptz not null,
  end_time        timestamptz not null,
  status          text not null default 'CONFIRMED'
                    check (status in ('CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED')),
  checked_in_at   timestamptz,
  checked_out_at  timestamptz,
  created_at      timestamptz default now(),
  constraint valid_time_range check (end_time > start_time)
);

create index if not exists idx_bookings_slot    on bookings(slot_id);
create index if not exists idx_bookings_status  on bookings(status);
create index if not exists idx_bookings_user    on bookings(demo_user_name);

-- 5. Booking code sequence helper
create sequence if not exists booking_seq;

-- 6. Prevent overlapping active bookings for the same slot
--    Using a function + trigger (exclusion constraints need btree_gist)
create or replace function check_slot_overlap()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from bookings
    where slot_id = new.slot_id
      and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and status in ('CONFIRMED','CHECKED_IN')
      and start_time < new.end_time
      and end_time > new.start_time
  ) then
    raise exception 'Slot is already booked for this time period';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_slot_overlap on bookings;
create trigger trg_check_slot_overlap
  before insert or update on bookings
  for each row execute function check_slot_overlap();

-- 7. create_booking RPC (atomic, safe)
create or replace function create_booking(
  p_slot_id    uuid,
  p_start_time timestamptz,
  p_end_time   timestamptz,
  p_user_name  text default 'John Smith',
  p_user_role  text default 'Student'
) returns uuid language plpgsql security definer as $$
declare
  v_code text;
  v_id   uuid;
begin
  -- Advisory lock on the slot to prevent race conditions
  perform pg_advisory_xact_lock(hashtext(p_slot_id::text));

  -- Generate booking code
  v_code := 'PS-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('booking_seq')::text, 3, '0');

  insert into bookings (booking_code, demo_user_name, demo_user_role, slot_id, start_time, end_time)
  values (v_code, p_user_name, p_user_role, p_slot_id, p_start_time, p_end_time)
  returning id into v_id;

  return v_id;
end;
$$;

-- 8. Row Level Security
alter table parking_areas  enable row level security;
alter table parking_slots  enable row level security;
alter table bookings       enable row level security;

-- Allow anon read on areas and active slots
create policy "Public read parking_areas"
  on parking_areas for select to anon using (true);

create policy "Public read active slots"
  on parking_slots for select to anon using (true);

-- Allow anon to read all bookings (demo mode)
create policy "Public read bookings"
  on bookings for select to anon using (true);

-- Allow anon to insert via RPC (create_booking is security definer)
create policy "Allow insert bookings"
  on bookings for insert to anon with check (true);

-- Allow anon to update bookings (for check-in/out, cancellation)
create policy "Allow update bookings"
  on bookings for update to anon using (true) with check (true);

-- Allow anon to manage slots (admin, demo mode)
create policy "Allow manage slots"
  on parking_slots for all to anon using (true) with check (true);

-- 9. Seed data
-- Areas
insert into parking_areas (id, name, description) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Main Campus (A)', '60 slots'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Science Block (B)', '40 slots'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Library (C)', '30 slots'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'Sports Complex (D)', '20 slots')
on conflict (id) do nothing;

-- Main Campus slots (A-01 to A-30, mix of Car/Bike/EV)
do $$
declare
  rows text[] := array['A','B','C','D'];
  r text;
  i int;
  slot_num text;
  stype text;
  area_id uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
begin
  foreach r in array rows loop
    for i in 1..8 loop
      slot_num := r || '-' || lpad(i::text, 2, '0');
      if i % 5 = 0 then stype := 'EV';
      elsif i % 3 = 0 then stype := 'Bike';
      else stype := 'Car';
      end if;
      insert into parking_slots (slot_number, area_id, slot_type)
      values (slot_num, area_id, stype)
      on conflict (area_id, slot_number) do nothing;
    end loop;
  end loop;
end;
$$;

-- Science Block slots
do $$
declare
  rows text[] := array['E','F','G'];
  r text;
  i int;
  slot_num text;
  area_id uuid := 'aaaaaaaa-0000-0000-0000-000000000002';
begin
  foreach r in array rows loop
    for i in 1..6 loop
      slot_num := r || '-' || lpad(i::text, 2, '0');
      insert into parking_slots (slot_number, area_id, slot_type)
      values (slot_num, area_id, case when i % 4 = 0 then 'EV' when i % 2 = 0 then 'Bike' else 'Car' end)
      on conflict (area_id, slot_number) do nothing;
    end loop;
  end loop;
end;
$$;

-- Library
do $$
declare
  rows text[] := array['H','I'];
  r text;
  i int;
  area_id uuid := 'aaaaaaaa-0000-0000-0000-000000000003';
begin
  foreach r in array rows loop
    for i in 1..5 loop
      insert into parking_slots (slot_number, area_id, slot_type)
      values (r || '-' || lpad(i::text,2,'0'), area_id, 'Car')
      on conflict (area_id, slot_number) do nothing;
    end loop;
  end loop;
end;
$$;

-- Sports Complex
do $$
declare
  i int;
  area_id uuid := 'aaaaaaaa-0000-0000-0000-000000000004';
begin
  for i in 1..5 loop
    insert into parking_slots (slot_number, area_id, slot_type)
    values ('J-' || lpad(i::text,2,'0'), area_id, 'Car')
    on conflict (area_id, slot_number) do nothing;
  end loop;
end;
$$;
