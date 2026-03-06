

# Correctifs et ajouts — Annonces, Modal Salon, Chaîne de liaison, Duplication

## 1. Threads dans le salon d'Annonces

**Problème** : `AnnouncementChannel.tsx` ne gère pas les messages système `[SYSTEM:THREAD_CREATED:...]`, ne rend pas `ThreadSpine`/`ThreadSystemMessage`, et ne permet pas de créer des threads depuis un message.

**Fichier** : `src/components/channels/AnnouncementChannel.tsx`
- Importer `ThreadSystemMessage`, `CreateThreadModal`, `useThreads`, `Thread` (comme dans ChatArea)
- Dans la boucle de rendu des messages, détecter `[SYSTEM:THREAD_CREATED:...]` et rendre le spine + embed (copier le pattern de ChatArea lignes 1275-1331)
- Ajouter l'état `createThreadForMessageId` et l'action "Créer un thread" dans le context menu / actions
- Pour les messages non-system, afficher `ThreadSystemMessage` sous le message si un thread y est rattaché (via `threadsByMessageId`)
- Ajouter la prop `onSelectThread` qui navigue ou ouvre le thread panel
- Ajouter `CreateThreadModal` en bas du composant

## 2. Modal Salon — Bouton Supprimer fixe + pas de re-centrage

**Problème** : Le bouton "Supprimer le salon" bouge quand on scroll, et le modal se repositionne lors du changement d'onglet.

**Fichier** : `src/components/channel-settings/ChannelSettingsModal.tsx`
- Desktop : Sortir `ChannelDangerZone` du `TabsContent[overview]` et le placer en `sticky bottom-0` dans le conteneur scrollable, ou mieux, en dehors du `overflow-y-auto` comme footer fixe
- Ajouter une hauteur minimale fixe au conteneur des `TabsContent` (ex: `min-h-[400px]`) pour éviter que le dialog se redimensionne et se re-centre à chaque changement d'onglet
- Mobile : Même logique — `ChannelDangerZone` en bas fixe

## 3. Chaîne de liaison — Retirer badge type + renommer Description + checkbox confiance

### 3a. Retirer le badge "Type de salon" pour TOUS les types non-toggleable
**Fichier** : `src/components/channel-settings/ChannelOverview.tsx`
- Supprimer le bloc `{!canToggleType && (...)}` (lignes 211-222) qui affiche le badge "Type de salon" avec "(non modifiable)"

### 3b. Renommer "Description" en "URL de destination" pour les link channels
**Fichier** : `src/components/channel-settings/ChannelOverview.tsx`
- Conditionner le label : `channel.type === 'link' ? "URL de destination" : "Description"`
- Adapter le placeholder en conséquence

### 3c. Checkbox "Faire confiance à cette URL"
**Fichier** : `src/components/channel-settings/ChannelOverview.tsx`
- Ajouter un `Checkbox` sous le champ URL pour les link channels : "Les membres peuvent ouvrir ce lien sans avertissement"
- Stocker cette valeur dans un champ existant ou nouveau. Puisqu'il n'y a pas de colonne dédiée, on peut encoder cette info dans la description (préfixe `[TRUSTED]`) ou ajouter une colonne `is_trusted` à la table channels

**Fichier** : `src/components/modals/ExternalLinkWarningModal.tsx`
- Accepter une prop optionnelle `trusted?: boolean` — si `true`, ouvrir directement sans modal

**Fichier** : `src/components/layout/ChannelList.tsx`
- Passer l'info trusted lors du clic sur un lien channel

**Base de données** : Migration pour ajouter une colonne `is_link_trusted boolean default false` à la table `channels`

## 4. Accessibilité — ENTER pour enregistrer les modifications

**Fichier** : `src/components/channel-settings/ChannelOverview.tsx`
- Wrapper le formulaire dans un `<form>` avec `onSubmit` qui appelle `handleSave`
- Ou ajouter un `onKeyDown` sur les inputs : si `Enter` (sans Shift) et `hasChanges`, appeler `handleSave`

## 5. Duplication — Modal avec onglets Aperçu/Permissions

**Problème** : Actuellement la duplication se fait silencieusement. L'utilisateur veut un modal de confirmation/configuration.

**Nouveau fichier** : `src/components/modals/DuplicateChannelModal.tsx`
- Modal avec 2 onglets : **Aperçu** (nom éditable pré-rempli, type affiché) et **Permissions** (liste des overrides copiées, possibilité de décocher)
- Bouton "Dupliquer" qui appelle la mutation existante `useDuplicateChannel` (potentiellement étendue pour accepter un nom custom et un flag `copyPermissions`)

**Fichier** : `src/components/layout/ChannelList.tsx`
- Remplacer l'appel direct à `handleDuplicateChannel` par l'ouverture du `DuplicateChannelModal`

**Fichier** : `src/hooks/useChannels.ts`
- Étendre `useDuplicateChannel` pour accepter un `name` optionnel et un `copyPermissions` boolean

---

### Fichiers modifiés (7) + 1 nouveau + 1 migration

| Fichier | Changement |
|---|---|
| `src/components/channels/AnnouncementChannel.tsx` | Intégrer threads (system messages, spine, create, embed) |
| `src/components/channel-settings/ChannelSettingsModal.tsx` | DangerZone fixe + min-height pour éviter re-centrage |
| `src/components/channel-settings/ChannelOverview.tsx` | Retirer badge type, renommer label link, checkbox trusted, ENTER save |
| `src/components/modals/ExternalLinkWarningModal.tsx` | Supporter bypass trusted |
| `src/components/layout/ChannelList.tsx` | Trusted link bypass + DuplicateChannelModal |
| `src/hooks/useChannels.ts` | Étendre useDuplicateChannel (nom, permissions) |
| `src/components/modals/DuplicateChannelModal.tsx` | **Nouveau** — Modal duplication avec onglets |
| Migration SQL | Ajouter `is_link_trusted` à channels |

