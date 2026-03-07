

# Correctifs : Lien de confiance dans le modal externe + Thread system message dupliqué

## 3 changements

### 1. Checkbox "Lien de confiance" dans ExternalLinkWarningModal

Déplacer la checkbox depuis `ChannelOverview` vers le modal `ExternalLinkWarningModal`. Le modal doit recevoir `channelId` et `serverId` pour pouvoir sauvegarder `is_link_trusted` via `useUpdateChannel`.

**`src/components/modals/ExternalLinkWarningModal.tsx`**
- Ajouter les props optionnelles `channelId`, `channelName`, `serverId`, `isLinkTrusted`
- Ajouter un état local `trusted` initialisé à `isLinkTrusted`
- Afficher une checkbox (comme dans l'image de référence) : "Lien de confiance" + description "Les membres pourront ouvrir ce lien directement sans passer par l'avertissement de lien externe."
- Au clic sur "Ouvrir le lien", si `trusted` a changé, appeler `useUpdateChannel` pour sauvegarder `is_link_trusted`

**`src/components/layout/ChannelList.tsx`** et **`src/components/mobile/MobileChannelListView.tsx`**
- Passer `channelId`, `channelName`, `serverId` et `is_link_trusted` au state `externalLinkModal`
- Transmettre ces props à `ExternalLinkWarningModal`
- Si `is_link_trusted === true`, bypasser le modal et ouvrir directement le lien

**`src/components/channel-settings/ChannelOverview.tsx`**
- Retirer la section checkbox "Lien de confiance" (déplacée dans le modal externe)

### 2. Pas de message système pour les threads créés sur un message spécifique

Quand un thread est créé via clic-droit sur un message (avec `messageId`), le `ThreadSystemMessage` est déjà rendu sous le message parent grâce à `threadsByMessageId`. Le message système `[SYSTEM:THREAD_CREATED:]` crée un doublon.

**`src/hooks/useThreads.ts`** (dans `useCreateThread`)
- Modifier la condition d'insertion du message système : ne l'insérer que si `messageId` est absent (`!messageId && !isPrivate`)
- Si le thread est attaché à un message parent, l'embed `ThreadSystemMessage` sous ce message suffit

### 3. Passer `is_link_trusted` depuis les données channels

Les données des channels sont déjà chargées via `useChannels` — le champ `is_link_trusted` est dans la table. Il faut simplement le lire depuis l'objet channel lors du clic.

**`src/hooks/useChannels.ts`**
- Vérifier que le select inclut `is_link_trusted` (il est dans la table, le type Supabase le contient déjà)

