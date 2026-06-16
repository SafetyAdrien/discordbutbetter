## Objectif

Supprimer le `Dialog` modal avec backdrop sombre. Le profil utilisateur s'ouvre désormais **partout** sous forme d'un **petit conteneur flottant ancré près du pseudo cliqué** (style Discord), sans assombrissement de l'arrière-plan, fermable au clic en dehors ou via Échap.

## Approche

### 1. Capture universelle de la position du clic
Ajouter dans `src/components/profile/UserProfilePopup.tsx` un **registre global léger** :
```ts
let lastProfileTriggerRect: DOMRect | null = null;
export function rememberProfileTrigger(e: React.MouseEvent | MouseEvent) { ... }
```
Cette fonction stocke le `getBoundingClientRect()` de l'élément cliqué. Elle est appelée par chaque caller au moment d'ouvrir le popup (un seul appel `onMouseDown` à ajouter sur chaque trigger).

### 2. Refonte du mode rendu (UserProfilePopup.tsx)
- Supprimer la branche `Dialog` desktop. Le rendu desktop devient **toujours** un portail flottant identique à l'actuel `mode='card'` (340px, `bg-card`, `rounded-xl`, `shadow-2xl`), **sans overlay assombri**.
- Calcul automatique de la position :
  - Si `cardPosition` prop est fournie → l'utiliser (rétro-compat VoiceParticipantGrid).
  - Sinon utiliser `lastProfileTriggerRect` :
    - Horizontal : à droite du trigger (`left: rect.right + 8`), fallback à gauche si déborde.
    - Vertical : aligné sur le haut du trigger, ajusté pour rester dans le viewport (`bottom >= 8`).
  - Fallback ultime : centre-bas de l'écran.
- Wrapper du portail :
  - `<div className="fixed inset-0 z-50 pointer-events-none">` (pas de fond noir, ne bloque pas les interactions ailleurs sauf sur la carte).
  - La carte elle-même : `pointer-events-auto`.
  - Listener `mousedown` global sur `document` → si le clic est hors de la carte, fermer.
  - Listener `keydown` Escape → fermer.
- Mode mobile (`Drawer` du bas) : **inchangé**.

### 3. Mise à jour des callers (7 fichiers)
Ajouter `onMouseDownCapture={rememberProfileTrigger}` (ou équivalent) sur l'élément déclencheur du popup, puis appeler `setSelectedUser(...)` comme aujourd'hui.

Fichiers concernés :
- `src/components/chat/ChatArea.tsx` (clic sur pseudo dans messages)
- `src/components/channels/AnnouncementChannel.tsx` (clic sur pseudo dans annonces)
- `src/components/layout/MemberList.tsx` (clic sur membre)
- `src/components/dm/DMConversation.tsx` (clic sur participant DM)
- `src/components/mobile/dm/MobileDMConversation.tsx` (mobile → géré par Drawer, ajout non requis)
- `src/components/layout/ChannelList.tsx` (déjà en `mode='card'`, simple harmonisation)
- `src/components/channels/voice/VoiceParticipantGrid.tsx` (déjà en `mode='card'`, inchangé)

Pour chacun : repérer l'élément/cellule qui déclenche `setSelectedUser(...)` et ajouter `onMouseDownCapture={(e) => rememberProfileTrigger(e)}` sur ce nœud. Aucun changement de logique métier.

### 4. Suppression de l'API `mode`
Le prop `mode` devient inutile (toujours flottant sur desktop, toujours Drawer sur mobile). Le garder accepté pour rétro-compat mais ignoré, et retirer son utilisation côté `VoiceParticipantGrid` / `ChannelList` (purement cosmétique, optionnel).

## Hors scope
- Pas de changement du contenu visuel de la carte (déjà refondu Discord-like).
- Pas de changement de `FullUserProfileModal` (qui reste un modal normal puisqu'ouvert via "Voir bio complète").
- Pas de modification mobile (Drawer conservé).

## Fichiers touchés
- `src/components/profile/UserProfilePopup.tsx` (refonte du wrapper + helper export)
- `src/components/chat/ChatArea.tsx`
- `src/components/channels/AnnouncementChannel.tsx`
- `src/components/layout/MemberList.tsx`
- `src/components/dm/DMConversation.tsx`
- `src/components/layout/ChannelList.tsx`
