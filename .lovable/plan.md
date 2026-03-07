

# Correctifs et améliorations — Salons, Modal, Duplication, Accessibilité

## Résumé des changements

7 axes de travail couvrant des correctifs d'interface, de l'accessibilité clavier, et une nouvelle fonctionnalité de duplication avec modal.

---

## 1. Threads dans le salon d'Annonces

**Fichier** : `src/components/channels/AnnouncementChannel.tsx`

Le salon d'annonces ne supporte pas les threads (pas de `useThreads`, pas de `ThreadSystemMessage`, pas de `ThreadSpine`, pas de `CreateThreadModal`). Il faut porter le système complet depuis `ChatArea.tsx` :

- Importer `useThreads`, `ThreadSystemMessage`, `ThreadSpine`, `CreateThreadModal`, `Thread`
- Ajouter le hook `useThreads(channel.id)` et construire `threadsByMessageId` (map message_id → thread)
- Ajouter les props `onSelectThread` et `activeThreadId` à `AnnouncementChannelProps`
- Dans le rendu des messages :
  - Détecter les messages système `[SYSTEM:THREAD_CREATED:id:nom]` et les rendre avec le spine + `ThreadSystemMessage` (même pattern que ChatArea lignes 1280-1331)
  - Après chaque message normal, si `threadsByMessageId.has(message.id)`, afficher `ThreadSystemMessage` avec le spine (même pattern que ChatArea lignes 1517-1524 et 1528-1536)
- Ajouter le bouton "Créer un thread" dans le context menu et les actions de message
- Passer `onSelectThread` depuis `Index.tsx` et `MobileLayout.tsx` lors du rendu de `AnnouncementChannel`

**Fichiers impactés** : `src/pages/Index.tsx`, `src/components/mobile/MobileLayout.tsx` (passage des props thread)

---

## 2. Modal de salon — Bouton supprimer fixe + stabilité du modal

**Fichier** : `src/components/channel-settings/ChannelSettingsModal.tsx`

- Ajouter `min-h-[400px]` sur le conteneur scrollable (`div.flex-1.overflow-y-auto`) pour empêcher le recentrage du dialog lors du switch de tab
- Séparer `ChannelDangerZone` du contenu scrollable pour le rendre sticky/fixe en bas. Restructurer le layout desktop :
  ```
  <div className="flex-1 overflow-y-auto min-h-[400px]">
    <TabsContent overview> <ChannelOverview /> </TabsContent>
    <TabsContent permissions> ... </TabsContent>
    <TabsContent integrations> ... </TabsContent>
  </div>
  {/* Fixed at bottom, outside scroll */}
  <div className="border-t border-border pt-3 mt-auto">
    <ChannelDangerZone ... />
  </div>
  ```
- Même traitement sur mobile : sortir `ChannelDangerZone` du `TabsContent` overview et le placer en sticky bottom

---

## 3. Chaîne de liaison — Nettoyage de l'overview

**Fichier** : `src/components/channel-settings/ChannelOverview.tsx`

- Supprimer le bloc "Type de salon" avec badge pour **tous** les types non-toggleables (retirer les lignes 210-222 qui affichent le badge `!canToggleType`)
- Pour les salons de type `link` :
  - Renommer le label "Description" en "URL de destination :"
  - Ajouter une checkbox "Lien de confiance" qui met à jour `is_link_trusted` via `useUpdateChannel`

**Fichier** : `src/hooks/useChannelSettings.ts`
- Ajouter `is_link_trusted` au type `ChannelDetails` et à la query select
- Ajouter `is_link_trusted` comme champ mutable dans `useUpdateChannel`

**Migration DB** : Ajouter la colonne `is_link_trusted boolean default false` à la table `channels` (si pas déjà présente — la recherche montre qu'elle n'existe pas encore)

---

## 4. Accessibilité — Touche Enter pour enregistrer

**Fichier** : `src/components/channel-settings/ChannelOverview.tsx`
- Envelopper le formulaire dans un `<form onSubmit>` ou ajouter un `onKeyDown` sur les champs Input/Textarea : quand `Enter` est pressé (sans Shift), appeler `handleSave()` si `hasChanges`

---

## 5. Duplication de salon — Modal avec tabs

**Nouveau fichier** : `src/components/modals/DuplicateChannelModal.tsx`

Modal avec deux onglets :
- **Aperçu** : Input pour le nom du salon (pré-rempli avec le nom original), aperçu du type
- **Permissions** : Checkbox "Copier les permissions du salon original" (coché par défaut)
- Bouton de confirmation + support touche Enter pour confirmer
- Appelle `useDuplicateChannel` avec les paramètres (nom custom, copyPermissions)

**Fichier** : `src/hooks/useChannels.ts` (`useDuplicateChannel`)
- Ajouter les paramètres optionnels `customName?: string` et `copyPermissions?: boolean` à la mutation
- Si `customName` fourni, l'utiliser au lieu de `original.name`
- Si `copyPermissions` est `false`, ne pas copier les `channel_permission_overrides`

**Fichier** : `src/components/layout/ChannelList.tsx`
- Remplacer l'appel direct `handleDuplicateChannel` par l'ouverture de `DuplicateChannelModal`
- Ajouter l'état `duplicatingChannelId` pour gérer l'ouverture/fermeture du modal

---

## Ordre d'implémentation

1. Migration DB (`is_link_trusted`)
2. `useChannelSettings.ts` (ajout `is_link_trusted`)
3. `ChannelOverview.tsx` (retrait badge type, renommage label link, checkbox confiance, Enter save)
4. `ChannelSettingsModal.tsx` (danger zone fixe, min-height)
5. `DuplicateChannelModal.tsx` (nouveau) + `useChannels.ts` (params) + `ChannelList.tsx` (intégration)
6. `AnnouncementChannel.tsx` (threads) + `Index.tsx` / `MobileLayout.tsx` (props)

