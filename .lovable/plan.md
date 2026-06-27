Plan de correctifs RLS sur la migration DM polls avant build.

Fichier cible : `supabase/migrations/20260627083954_94ca533e-fd2d-48ae-a5cf-d0396203d920.sql`

Modifications demandées :

1. `dm_polls_update` — ajouter un WITH CHECK explicite pour bloquer le détournement de `conversation_id` vers une conversation où l'auteur n'est pas participant.

   Remplacer :
   ```sql
   CREATE POLICY "dm_polls_update" ON public.dm_polls
     FOR UPDATE USING (auth.uid() = author_id);
   ```
   Par :
   ```sql
   CREATE POLICY "dm_polls_update" ON public.dm_polls
     FOR UPDATE
     USING (auth.uid() = author_id)
     WITH CHECK (
       auth.uid() = author_id
       AND public.is_dm_participant(auth.uid(), conversation_id)
     );
   ```

2. `dm_polls_votes_insert` — ajouter une jointure sur `dm_poll_options` dans le WITH CHECK pour garantir que l'`option_id` appartient bien au `poll_id` visé.

   Remplacer :
   ```sql
   CREATE POLICY "dm_poll_votes_insert" ON public.dm_poll_votes
     FOR INSERT WITH CHECK (
       auth.uid() = user_id
       AND EXISTS (
         SELECT 1 FROM public.dm_polls p
         WHERE p.id = dm_poll_votes.poll_id
           AND public.is_dm_participant(auth.uid(), p.conversation_id)
       )
     );
   ```
   Par :
   ```sql
   CREATE POLICY "dm_poll_votes_insert" ON public.dm_poll_votes
     FOR INSERT WITH CHECK (
       auth.uid() = user_id
       AND EXISTS (
         SELECT 1 FROM public.dm_polls p
         WHERE p.id = dm_poll_votes.poll_id
           AND public.is_dm_participant(auth.uid(), p.conversation_id)
       )
       AND EXISTS (
         SELECT 1 FROM public.dm_poll_options o
         WHERE o.id = dm_poll_votes.option_id
           AND o.poll_id = dm_poll_votes.poll_id
       )
     );
   ```

Après application, afficher le diff complet de la migration mise à jour, puis lancer le build/tests.