-- 20260618090009_handle_new_user.sql
-- Step 3 — Auth & user profiles (Doc 04 §2, Doc 09 §3).
-- When Supabase Auth creates a user, bootstrap their app-level profile and a
-- free-tier subscription so the rest of the app always has those rows to rely on.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer            -- runs as the owner so it can write despite RLS
set search_path = public    -- hardening for SECURITY DEFINER (avoid search_path hijack)
as $$
begin
  insert into public.profiles (id, display_name, country)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'country', '')
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, tier, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT on auth.users: creates the profiles row and a free-tier subscription.';

-- One trigger per new auth user.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
