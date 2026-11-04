\set ON_ERROR_STOP off
insert into auth.users values ('00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000b2'),('00000000-0000-0000-0000-0000000000c3');
insert into servers (id, owner_id, name) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','Alpha'),('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','Beta');
insert into server_members (server_id,user_id) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1'),
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b2'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000b2');
\echo == A: admin cree SPCE
set app.uid = '00000000-0000-0000-0000-0000000000a1';
select name, badge_id, color, enabled, version from upsert_server_tag('10000000-0000-0000-0000-000000000001','SPCE','planet','#2880FB',true,null);
\echo == A2: membre non admin refuse
set app.uid = '00000000-0000-0000-0000-0000000000b2';
select upsert_server_tag('10000000-0000-0000-0000-000000000001','HACK','planet',null,true,null);
\echo == A3: nom invalide / couleur invalide / badge invalide
set app.uid = '00000000-0000-0000-0000-0000000000a1';
select upsert_server_tag('10000000-0000-0000-0000-000000000001','<b>x','planet',null,true,null);
select upsert_server_tag('10000000-0000-0000-0000-000000000001','ABCDE','planet',null,true,null);
select upsert_server_tag('10000000-0000-0000-0000-000000000001','OK','planet','red',true,null);
select upsert_server_tag('10000000-0000-0000-0000-000000000001','OK','nope',null,true,null);
\echo == B: membre selectionne SPCE
set app.uid = '00000000-0000-0000-0000-0000000000b2';
select server_id, applied_version from set_my_server_tag('10000000-0000-0000-0000-000000000001');
\echo == B2: non-membre refuse
set app.uid = '00000000-0000-0000-0000-0000000000c3';
select set_my_server_tag('10000000-0000-0000-0000-000000000001');
\echo == E1: admin change la couleur -> version 2 (concurrence: ancienne version refusee)
set app.uid = '00000000-0000-0000-0000-0000000000a1';
select version from upsert_server_tag('10000000-0000-0000-0000-000000000001','SPCE','planet','#ff0000',true,1);
select upsert_server_tag('10000000-0000-0000-0000-000000000001','SPCE','planet','#00ff00',true,1);
\echo == E2: le tag du membre est obsolete (applied 1 vs version 2)
select u.applied_version, t.version, (u.applied_version = t.version) as displayed from user_server_tags u join server_tags t using (server_id);
\echo == E3: tag Beta + changement trop rapide refuse, puis OK apres delai
select upsert_server_tag('10000000-0000-0000-0000-000000000002','BETA','star',null,true,null);
set app.uid = '00000000-0000-0000-0000-0000000000b2';
select server_id from set_my_server_tag('10000000-0000-0000-0000-000000000002');
select set_my_server_tag('10000000-0000-0000-0000-000000000001');
update user_server_tags set selected_at = now() - interval '1 minute';
select server_id from set_my_server_tag('10000000-0000-0000-0000-000000000001');
\echo == unicite: une seule ligne par utilisateur
select count(*) as rows_for_user from user_server_tags where user_id = '00000000-0000-0000-0000-0000000000b2';
\echo == E4: depart du serveur revoque le tag
delete from server_members where server_id='10000000-0000-0000-0000-000000000001' and user_id='00000000-0000-0000-0000-0000000000b2';
select count(*) as rows_after_leave from user_server_tags where user_id = '00000000-0000-0000-0000-0000000000b2';
\echo == retrait manuel + suppression du serveur
select set_my_server_tag('10000000-0000-0000-0000-000000000002');
select clear_my_server_tag();
select count(*) as rows_after_clear from user_server_tags;
set app.uid = '00000000-0000-0000-0000-0000000000a1';
select set_my_server_tag('10000000-0000-0000-0000-000000000001');
delete from servers where id='10000000-0000-0000-0000-000000000001';
select count(*) as tags_after_server_delete from server_tags where server_id='10000000-0000-0000-0000-000000000001';
\echo == desactivation: tag desactive -> refus de selection
update server_tags set enabled=false where server_id='10000000-0000-0000-0000-000000000002';
set app.uid = '00000000-0000-0000-0000-0000000000b2';
select set_my_server_tag('10000000-0000-0000-0000-000000000002');
