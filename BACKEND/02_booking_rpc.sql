-- PitakGo booking transitions. Run AFTER schema.sql in Supabase SQL Editor.
-- The caller is identified only through auth.uid(); never accept actor ids from clients.
create or replace function public.pitakgo_reservation_action(p_reservation uuid, p_action text)
returns public.reservations
language plpgsql security definer set search_path = ''
as $$
declare v_b public.reservations; v_driver uuid; v_ride_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  select * into v_b from public.reservations where id=p_reservation for update;
  if not found then raise exception 'Reservation not found'; end if;
  select driver_id,status into v_driver,v_ride_status from public.rides where id=v_b.ride_id for update;
  if p_action='confirm' then
    if v_driver<>auth.uid() then raise exception 'Only driver may confirm'; end if;
    if v_b.status<>'pending' or v_ride_status<>'open' then raise exception 'Cannot confirm this reservation'; end if;
    update public.reservations set status='confirmed' where id=v_b.id returning * into v_b;
  elsif p_action='reject' then
    if v_driver<>auth.uid() then raise exception 'Only driver may reject'; end if;
    if v_b.status<>'pending' then raise exception 'Cannot reject this reservation'; end if;
    update public.reservations set status='rejected' where id=v_b.id returning * into v_b;
  elsif p_action='cancel' then
    if v_b.passenger_id<>auth.uid() then raise exception 'Only passenger may cancel'; end if;
    if v_b.status not in ('pending','confirmed') or v_ride_status not in ('open','boarding') then raise exception 'Cannot cancel this reservation'; end if;
    update public.reservations set status='cancelled' where id=v_b.id returning * into v_b;
  else raise exception 'Unsupported action'; end if;
  return v_b;
end $$;
revoke all on function public.pitakgo_reservation_action(uuid,text) from public;
grant execute on function public.pitakgo_reservation_action(uuid,text) to authenticated;

-- Prevent self-booking and booking a closed ride; hold seat via unique partial index in schema.sql.
create or replace function public.pitakgo_request_seat(p_ride uuid,p_seat text)
returns public.reservations
language plpgsql security definer set search_path = ''
as $$
declare v_driver uuid; v_status text; v_result public.reservations;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_seat not in ('front','rearLeft','rearMiddle','rearRight') then raise exception 'Invalid seat'; end if;
  select driver_id,status into v_driver,v_status from public.rides where id=p_ride for update;
  if not found or v_status<>'open' then raise exception 'Ride unavailable'; end if;
  if v_driver=auth.uid() then raise exception 'Driver cannot book own ride'; end if;
  if exists (select 1 from public.reservations where ride_id=p_ride and passenger_id=auth.uid() and status in ('pending','confirmed')) then
    raise exception 'You already have an active reservation for this ride';
  end if;
  insert into public.reservations(ride_id,passenger_id,seat,status)
  values(p_ride,auth.uid(),p_seat,'pending') returning * into v_result;
  return v_result;
exception when unique_violation then raise exception 'Seat has already been reserved';
end $$;
revoke all on function public.pitakgo_request_seat(uuid,text) from public;
grant execute on function public.pitakgo_request_seat(uuid,text) to authenticated;
-- Remove direct insert to ensure validation happens through the RPC.
drop policy if exists "passenger requests seat" on public.reservations;
