

# Interactions utilisateur sur les participants vocaux (sidebar + grille)

## Contexte actuel

Les participants vocaux apparaissent à **deux endroits** :
1. **Sidebar** (`ChannelList.tsx`, lignes 560-588) — simple `<div>` sans aucune interaction (ni clic gauche, ni clic droit)
2. **Grille vocale** (`VoiceParticipantGrid.tsx`) — clic gauche ouvre un `VoiceParticipantPopover` (volume) **ou** fait un focus, mais pas de clic droit

## Changements prévus

### 1. Clic gauche sur un participant (sidebar + grille) → Profil popup

- Ouvrir le `UserProfilePopup` existant en mode `card` avec le profil de l'utilisateur cliqué
- Récupérer le profil complet depuis le cache React Query (`['profile', userId]` ou `['members', serverId]`)
- Appliquer le même pattern que la MemberList (qui ouvre déjà `UserProfilePopup`)

### 2. Clic gauche → Quick Actions (volume slider horizontal)

- Intégrer un slider de volume horizontal compact **dans le `UserProfilePopup`** en bas (uniquement affiché quand l'utilisateur est en vocal avec la cible)
- Slider horizontal avec un dot, valeur 0-200%, même logique que `useVoiceUserSettings.setUserVolume`
- Mise à jour optimiste instantanée (déjà implémentée dans `useVoiceUserSettings`)

### 3. Clic droit sur un participant → Menu contextuel

Créer un `ContextMenu` natif (Radix) sur chaque participant avec :
- **"Muter cet utilisateur"** → met le volume à 0 localement (via `setUserVolume({ volume: 0 })`)
- **"Couper le son"** → met le volume à 0 et applique une icône casque barré (même mécanisme)
- **"Réinitialiser le volume"** → remet à 100%
- Séparateur + **"Voir le profil"** → ouvre le profil popup

Tout fonctionne via `useVoiceUserSettings` qui a déjà les optimistic updates.

### Fichiers à modifier

- **`src/components/layout/ChannelList.tsx`** (lignes 560-588) — Wrapper chaque participant vocal dans un `ContextMenu` + ajouter `onClick` pour ouvrir le profil popup, + passer un state pour `UserProfilePopup`
- **`src/components/channels/voice/VoiceParticipantGrid.tsx`** (lignes 350-378) — Ajouter un `ContextMenu` autour de chaque participant sans caméra, et sur les tiles avec caméra. Séparer clic gauche (profil) du focus mode
- **`src/components/channels/voice/VoiceParticipantPopover.tsx`** — Enrichir ou remplacer par un composant qui combine profil + volume slider horizontal
- **Nouveau fichier : `src/components/channels/voice/VoiceParticipantContextMenu.tsx`** — Menu contextuel réutilisable (muter, couper son, profil) utilisé à la fois dans la sidebar et la grille

### Comportement détaillé

**Sidebar (ChannelList)** :
- Clic gauche → ouvre `UserProfilePopup` en mode card, positionné à droite du clic
- Clic droit → `VoiceParticipantContextMenu` avec mute/deafen/profil

**Grille (VoiceParticipantGrid)** :
- Clic gauche → ouvre `UserProfilePopup` (au lieu du focus mode actuel, le focus mode sera sur double-clic ou bouton Maximize)
- Clic droit → `VoiceParticipantContextMenu`
- Le `VoiceParticipantPopover` existant reste accessible via le profil popup (volume slider intégré)

### Garantie temps réel et optimistic

- `useVoiceUserSettings` a déjà `onMutate` avec optimistic update pour le volume
- Les mutations `serverMuteUser`/`serverDeafenUser` utilisent des RPC sécurisées
- Le profil est résolu depuis le cache existant (pas de fetch supplémentaire)

