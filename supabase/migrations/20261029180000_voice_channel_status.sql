-- Statut de salon vocal ("Quel est le sujet de la discussion ?") : texte libre (emoji compris)
-- visible dans la liste des salons et l'en-tete du salon. Seules les personnes connectees au
-- salon peuvent le modifier ; il disparait quand le salon se vide.
alter table public.channels
  add column if not exists voice_status text check (voice_status is null or char_length(voice_status) <= 500);

create or replace function public.set_voice_channel_status(p_channel_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;
  if not exists (select 1 from public.voice_states where channel_id = p_channel_id and user_id = auth.uid()) then
    raise exception 'Tu dois être connecté à ce salon vocal pour définir son statut';
  end if;
  update public.channels
     set voice_status = nullif(btrim(p_status), '')
   where id = p_channel_id and type = 'voice';
end;
$$;

revoke all on function public.set_voice_channel_status(uuid, text) from public;
grant execute on function public.set_voice_channel_status(uuid, text) to authenticated;

create or replace function public.clear_voice_status_when_empty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.voice_states where channel_id = old.channel_id) then
    update public.channels set voice_status = null where id = old.channel_id and voice_status is not null;
  end if;
  return old;
end;
$$;

drop trigger if exists voice_states_clear_status on public.voice_states;
create trigger voice_states_clear_status
  after delete on public.voice_states
  for each row execute function public.clear_voice_status_when_empty();
