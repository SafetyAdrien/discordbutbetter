\set ON_ERROR_STOP off
insert into auth.users values ('00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000b2'),('00000000-0000-0000-0000-0000000000c3'),('00000000-0000-0000-0000-0000000000d4'),('00000000-0000-0000-0000-0000000000e5'),('00000000-0000-0000-0000-0000000000f6');
insert into profiles select id from auth.users;
insert into servers (id, owner_id) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1');
insert into channels (id, server_id) values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');
-- a1 proprietaire, b2 createur, c3 invite direct, d4 a le role invite, e5 non invite, f6 moderateur (role Mod)
insert into server_members (id, server_id, user_id) values
 ('30000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1'),
 ('30000000-0000-0000-0000-0000000000b2','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b2'),
 ('30000000-0000-0000-0000-0000000000c3','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c3'),
 ('30000000-0000-0000-0000-0000000000d4','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000d4'),
 ('30000000-0000-0000-0000-0000000000e5','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000e5'),
 ('30000000-0000-0000-0000-0000000000f6','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000f6');
insert into roles (id, server_id, name) values ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Equipe'),('40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Mod');
insert into member_roles (member_id, role_id) values ('30000000-0000-0000-0000-0000000000d4','40000000-0000-0000-0000-000000000001'),('30000000-0000-0000-0000-0000000000f6','40000000-0000-0000-0000-000000000002');

\echo == 1: b2 cree un fil prive (RETURNING doit marcher) puis ses acces (role Equipe + membre c3)
set role authenticated;
set app.uid = '00000000-0000-0000-0000-0000000000b2';
insert into threads (id, channel_id, name, created_by, is_private) values ('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Secret','00000000-0000-0000-0000-0000000000b2',true) returning name;
insert into thread_access (thread_id, role_id) values ('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001');
insert into thread_access (thread_id, user_id) values ('50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c3');
\echo == 1b: doublon refuse / ligne vide refusee (attendu: 2 erreurs)
insert into thread_access (thread_id, user_id) values ('50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c3');
insert into thread_access (thread_id) values ('50000000-0000-0000-0000-000000000001');
insert into thread_messages (thread_id, author_id, content) values ('50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b2','premier message');
\echo == 2: fil public pour comparaison
insert into threads (id, channel_id, name, created_by, is_private) values ('50000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Public','00000000-0000-0000-0000-0000000000b2',false);

\echo == 3: visibilite des fils par utilisateur (attendu: a1,b2,c3,d4,f6 voient Secret ; e5 non ; tous voient Public)
do $$ declare u text; n int; m int; begin
 foreach u in array array['a1','b2','c3','d4','e5','f6'] loop
  perform set_config('app.uid', '00000000-0000-0000-0000-0000000000'||u, false);
  select count(*) into n from threads where name='Secret';
  select count(*) into m from threads where name='Public';
  raise notice '% -> Secret:% Public:%', u, n, m;
 end loop; end $$;
\echo == 4: les messages du fil prive suivent la meme regle
set app.uid = '00000000-0000-0000-0000-0000000000d4';
select count(*) as d4_messages from thread_messages;
set app.uid = '00000000-0000-0000-0000-0000000000e5';
select count(*) as e5_messages from thread_messages;
\echo == 5: e5 ne peut pas ecrire dans le fil prive (attendu: erreur RLS) ; d4 peut
insert into thread_messages (thread_id, author_id, content) values ('50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000e5','intrus');
set app.uid = '00000000-0000-0000-0000-0000000000d4';
insert into thread_messages (thread_id, author_id, content) values ('50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000d4','je suis du role');
\echo == 6: e5 ne peut ni se donner lacces ni voir la liste (attendu: erreur puis 0)
set app.uid = '00000000-0000-0000-0000-0000000000e5';
insert into thread_access (thread_id, user_id) values ('50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000e5');
select count(*) as e5_access_rows from thread_access;
\echo == 7: le moderateur f6 voit et peut gerer lacces ; c3 (simple invite) ne peut pas
set app.uid = '00000000-0000-0000-0000-0000000000f6';
select count(*) as f6_access_rows from thread_access;
insert into thread_access (thread_id, user_id) values ('50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000e5');
set app.uid = '00000000-0000-0000-0000-0000000000c3';
insert into thread_access (thread_id, user_id) values ('50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000f6');
\echo == 8: apres invitation par le moderateur, e5 voit le fil
set app.uid = '00000000-0000-0000-0000-0000000000e5';
select count(*) as e5_secret_after_invite from threads where name='Secret';
\echo == 9: retirer le role de d4 lui retire lacces
reset role;
delete from member_roles where member_id='30000000-0000-0000-0000-0000000000d4';
set role authenticated; set app.uid = '00000000-0000-0000-0000-0000000000d4';
select count(*) as d4_secret_after_role_removed from threads where name='Secret';
\echo == 10: supprimer le fil supprime les acces (cascade)
reset role;
delete from threads where id='50000000-0000-0000-0000-000000000001';
select count(*) as access_left from thread_access;
