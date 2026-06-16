# Refonte de la carte de profil utilisateur

Objectif: rendre la carte flottante "Discord-like" avec deux variantes claires selon le contexte (DM vs Serveur), format vertical compact (~300px de large, plus haut).

## 1. Deux variantes de carte

### Variante A — DM (privé ou groupé)
- Carte "universelle" minimaliste actuelle.
- Affiche: bannière, avatar+statut, statut personnalisé, pseudo global, username, badges, bio tronquée, date d'inscription, mutual servers/friends, note.
- **Aucun rôle, aucun bouton de gestion serveur.**
- S'ouvre depuis: `DMConversation`, `MobileDMConversation`, `DMUserInfoPanel`, `NewMessageModal`, `FriendsPanel`, `InboxPanel`.

### Variante B — Serveur
- Mêmes infos de base + section **Rôles** (tags colorés avec pastille).
- Si l'utilisateur courant a la permission `manage_roles` (admin / propriétaire / second owner via `usePermissions`): bouton **+** à la fin de la rangée des rôles → ouvre `RoleAssignmentPopover` existant. Tags affichent la croix `✕` pour retirer.
- Si simple membre: rôles affichés **read-only**, pas de **+**, pas de **✕**.
- **Profil serveur prioritaire**: si `server_profiles` contient une override (avatar / banner / display_name / bio / pronouns) pour cet utilisateur sur ce serveur, c'est CELA qui s'affiche (déjà chargé via `useServerProfile`). Sinon fallback profil global.
- S'ouvre depuis: `ChatArea` (messages), `AnnouncementChannel`, `MemberList`, `ChannelList` (voix), `VoiceParticipantGrid`.

## 2. Détection auto de la variante
Dans `UserProfilePopup`:
- Si `serverId` (prop déjà passée par les callers serveur) est défini → variante B.
- Sinon → variante A (DM).
- Les callers DM passent déjà `serverId={undefined}` — pas de changement côté appel.

## 3. Format visuel (Discord-like vertical)
- Largeur: **300px** (au lieu de 340).
- Bannière: 60px de haut (au lieu de 80).
- Avatar: 80px, débordant -40px sur la bannière, bordure 6px `bg-card`.
- Padding latéral: 16px.
- Disposition verticale stricte:
  ```
  [Bannière]
  [Avatar + bulle statut perso à droite]
  [Display name (gros)]
  [@username · pronoms]
  [Rangée badges]
  ─────────────
  [Section "À PROPOS" + bio tronquée + lien]
  [Section "MEMBRE DEPUIS" date]
  [Section "RÔLES" — variante B uniquement, tags + bouton +]
  [Note personnelle (footer compact)]
  ```
- Hauteur libre (contenu), max ~520px avec scroll interne si overflow.
- Pas de fond sombre/backdrop (déjà fait à l'étape précédente).

## 4. Section Rôles (variante B)
- Source: `useMembers(serverId)` → `member.roles` (déjà chargé).
- Rendu: tags `rounded-full` avec pastille couleur `bg-[role.color]`, label nom du rôle.
- Bouton **+** rond, même taille, ouvre `RoleAssignmentPopover` ancré sur le bouton.
- Croix `✕` visible au hover sur chaque tag si permission, déclenche `removeRole` (mutation existante dans `useMemberActions`).

## 5. Fichiers touchés
- `src/components/profile/UserProfilePopup.tsx` — refonte layout vertical, branchement variante A/B, intégration rôles + permissions + override `server_profiles`.
- Aucun changement nécessaire dans les callers (la prop `serverId` est déjà transmise correctement).
- Mobile (`Drawer`) suit la même logique de variante.

## Hors scope
- Pas de modification de `FullUserProfileModal`.
- Pas de nouveau hook ni nouvelle table.
- Pas de changement de logique métier rôles/permissions.
