-- PitakGo backend groundwork. Execute in your own Supabase SQL editor after review.
-- No server is configured in this ZIP; do not publish service-role keys in the app.
create extension if not exists pgcrypto;
create table if not exists public.pitaks (
 id uuid primary key default gen_random_uuid(), region text not null, locality text not null,
 name text not null, landmark text, lat double precision, lon double precision,
 verified boolean not null default false,
 constraint valid_coordinates check ((lat is null and lon is null) or (lat between -90 and 90 and lon between -180 and 180))
);
create table if not exists public.driver_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null, plate text not null, car_model text not null,
 home_pitak uuid references public.pitaks(id), current_pitak uuid references public.pitaks(id),
 status text not null default 'offline' check (status in ('offline','ready','rest')),
 rest_until timestamptz
);
create table if not exists public.rides (
 id uuid primary key default gen_random_uuid(), driver_id uuid not null references auth.users(id),
 origin_pitak uuid not null references public.pitaks(id), destination_pitak uuid not null references public.pitaks(id),
 fare_som integer not null check (fare_som>=0),
 status text not null default 'open' check(status in ('open','boarding','departed','cancelled')),
 created_at timestamptz not null default now(),
 check(origin_pitak<>destination_pitak)
);
create table if not exists public.reservations (
 id uuid primary key default gen_random_uuid(), ride_id uuid not null references public.rides(id),
 passenger_id uuid not null references auth.users(id),
 seat text not null check(seat in ('front','rearLeft','rearMiddle','rearRight')),
 status text not null default 'pending' check(status in ('pending','confirmed','rejected','cancelled','expired')),
 created_at timestamptz not null default now()
);
create unique index if not exists one_live_reservation_per_seat
 on public.reservations(ride_id,seat) where status in ('pending','confirmed');
create index if not exists rides_route_idx on public.rides(origin_pitak,destination_pitak,status);
create index if not exists reservations_passenger_idx on public.reservations(passenger_id);
alter table public.pitaks enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.rides enable row level security;
alter table public.reservations enable row level security;
create policy "read pitaks" on public.pitaks for select to authenticated using (true);
create policy "read drivers" on public.driver_profiles for select to authenticated using (true);
create policy "own driver profile insert" on public.driver_profiles for insert to authenticated with check(user_id=auth.uid());
create policy "own driver profile update" on public.driver_profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "read rides" on public.rides for select to authenticated using(true);
create policy "driver creates ride" on public.rides for insert to authenticated with check(driver_id=auth.uid());
create policy "driver updates ride" on public.rides for update to authenticated using(driver_id=auth.uid()) with check(driver_id=auth.uid());
create policy "read related reservations" on public.reservations for select to authenticated
 using(passenger_id=auth.uid() or exists(select 1 from public.rides r where r.id=ride_id and r.driver_id=auth.uid()));
create policy "passenger requests seat" on public.reservations for insert to authenticated
 with check(passenger_id=auth.uid() and status='pending' and exists(select 1 from public.rides r where r.id=ride_id and r.status='open'));
-- IMPORTANT: Status transitions require a SECURITY DEFINER RPC with explicit actor/transition checks.
-- No direct UPDATE policy is granted: this prevents passengers from self-confirming.
-- Add authenticated RPCs for approve/reject/cancel before enabling real reservations.
