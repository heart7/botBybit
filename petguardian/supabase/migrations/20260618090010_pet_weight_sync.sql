-- 20260618090010_pet_weight_sync.sql
-- Step 4 — Digital Twin integrity (Doc 08 §6 trends, §8 integrity).
-- Keep pets.current_weight_kg equal to the most recent weight in the Twin's weight
-- history, so the "current weight" snapshot can never drift from the time series.

create or replace function public.sync_pet_current_weight()
returns trigger
language plpgsql
as $$
declare
  target uuid := coalesce(new.pet_id, old.pet_id);
begin
  -- If the parent pet is gone (e.g. a cascade delete removed it), there is nothing
  -- to sync — skip to avoid touching a row that is being deleted.
  if not exists (select 1 from public.pets where id = target) then
    return coalesce(new, old);
  end if;

  update public.pets p
     set current_weight_kg = (
       select w.weight_kg
       from public.pet_weight_history w
       where w.pet_id = target
       order by w.recorded_at desc, w.created_at desc
       limit 1
     )
   where p.id = target;

  return coalesce(new, old);
end;
$$;

comment on function public.sync_pet_current_weight() is
  'Keeps pets.current_weight_kg in sync with the latest pet_weight_history entry.';

drop trigger if exists pet_weight_history_sync_current on public.pet_weight_history;
create trigger pet_weight_history_sync_current
  after insert or update or delete on public.pet_weight_history
  for each row execute function public.sync_pet_current_weight();
