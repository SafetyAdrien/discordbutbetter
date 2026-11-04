-- Dossiers de serveurs du rail (par utilisateur). Idempotent : la table peut
-- deja exister sur l'instance, on s'assure seulement du schema et des droits.
create table if not exists public.server_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  color text,
  server_ids uuid[] default '{}',
  position integer not null default 0,
  is_expanded boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.server_folders enable row level security;

drop policy if exists "Users manage their own server folders" on public.server_folders;
create policy "Users manage their own server folders" on public.server_folders
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists server_folders_user_idx on public.server_folders (user_id, position);
