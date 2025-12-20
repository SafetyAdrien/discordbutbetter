-- Supprimer l'ancienne politique ALL permissive
DROP POLICY IF EXISTS "Users can manage their voice state" ON voice_states;

-- Politique SELECT : tout le monde peut voir les états vocaux des membres du serveur
CREATE POLICY "Users can view voice states"
ON voice_states FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = voice_states.channel_id
    AND is_server_member(auth.uid(), c.server_id)
  )
);

-- Politique UPDATE : les utilisateurs peuvent modifier leur propre état
CREATE POLICY "Users can update own voice state"
ON voice_states FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Politique DELETE : les utilisateurs peuvent supprimer leur propre état
CREATE POLICY "Users can delete own voice state"
ON voice_states FOR DELETE
USING (auth.uid() = user_id);

-- Politique INSERT : vérification de la permission connect_voice
CREATE POLICY "Users can join voice channels with permission"
ON voice_states FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND has_channel_permission(auth.uid(), channel_id, 'connect_voice')
);