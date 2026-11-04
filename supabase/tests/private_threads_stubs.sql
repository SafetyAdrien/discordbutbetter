create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
create role authenticated; create role anon;
create type server_permission as enum ('manage_server','administrator','view_channel','send_messages','manage_threads','manage_channels','manage_messages','attach_files');
create table public.profiles (id uuid primary key);
create table public.servers (id uuid primary key default gen_random_uuid(), owner_id uuid, secondary_owner_id uuid);
create table public.server_members (id uuid primary key default gen_random_uuid(), server_id uuid references servers(id) on delete cascade, user_id uuid);
create table public.roles (id uuid primary key default gen_random_uuid(), server_id uuid references servers(id) on delete cascade, name text, is_default boolean default false);
create table public.member_roles (id uuid primary key default gen_random_uuid(), member_id uuid references server_members(id) on delete cascade, role_id uuid references roles(id) on delete cascade);
create table public.channels (id uuid primary key default gen_random_uuid(), server_id uuid references servers(id) on delete cascade);
create table public.threads (id uuid primary key default gen_random_uuid(), channel_id uuid references channels(id) on delete cascade, name text, created_by uuid, is_private boolean default false);
create table public.thread_messages (id uuid primary key default gen_random_uuid(), thread_id uuid references threads(id) on delete cascade, author_id uuid, content text, attachments jsonb);
create table public.thread_followers (id uuid primary key default gen_random_uuid(), thread_id uuid references threads(id) on delete cascade, user_id uuid);
create table public.thread_message_reactions (id uuid primary key default gen_random_uuid(), message_id uuid, user_id uuid, emoji text);
create table public.polls (id uuid primary key default gen_random_uuid(), channel_id uuid, thread_id uuid, author_id uuid);
create table public.messages (id uuid primary key default gen_random_uuid(), channel_id uuid, attachments jsonb);
create table public.dm_messages (id uuid primary key default gen_random_uuid(), conversation_id uuid, attachments jsonb);
create table public.media_posts (id uuid primary key default gen_random_uuid(), channel_id uuid);
create table public.media_post_items (id uuid primary key default gen_random_uuid(), post_id uuid, url text, thumbnail_url text);
create function public.is_dm_participant(u uuid, c uuid) returns boolean language sql as $$ select false $$;
create function public.is_server_owner_or_secondary(u uuid, s uuid) returns boolean language sql stable as $$ select exists(select 1 from servers where id=s and (owner_id=u or secondary_owner_id=u)) $$;
create function public.is_server_member(u uuid, s uuid) returns boolean language sql stable as $$ select exists(select 1 from server_members where server_id=s and user_id=u) $$;
-- has_channel_permission simule : tout membre a view/send ; manage_* = role nomme 'Mod'
create function public.has_channel_permission(u uuid, ch uuid, p server_permission) returns boolean language sql stable as $$
  select case when p in ('view_channel','send_messages') then exists(select 1 from channels c join server_members sm on sm.server_id=c.server_id where c.id=ch and sm.user_id=u)
  else exists(select 1 from channels c join server_members sm on sm.server_id=c.server_id join member_roles mr on mr.member_id=sm.id join roles r on r.id=mr.role_id where c.id=ch and sm.user_id=u and r.name='Mod') end $$;
-- policies preexistantes (versions d'origine)
alter table threads enable row level security; alter table thread_messages enable row level security; alter table thread_followers enable row level security;
alter table thread_message_reactions enable row level security; alter table polls enable row level security;
create policy "Members can view threads in their server channels" on threads for select using (exists(select 1 from channels c where c.id=threads.channel_id and is_server_member(auth.uid(), c.server_id)));
create policy "Members can view thread messages" on thread_messages for select using (true);
create policy "Members can send thread messages" on thread_messages for insert with check (true);
create policy "Members can view thread followers" on thread_followers for select using (true);
create policy "Members can view thread reactions" on thread_message_reactions for select using (true);
create policy "Members can add thread reactions" on thread_message_reactions for insert with check (true);
create policy "Members can create polls" on polls for insert with check (true);
create policy "Members can view polls" on polls for select using (true);
grant all on all tables in schema public to authenticated;
grant usage on schema public, auth to authenticated;
create policy "Members can create threads" on threads for insert with check (auth.uid() = created_by);
alter default privileges in schema public grant all on tables to authenticated;
