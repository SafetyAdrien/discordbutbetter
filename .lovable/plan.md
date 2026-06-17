# Interface Mobile — Plan

## 1. Fix de l'affichage des réponses (RepliedLine) en mobile

**Problème** : sur mobile, `ChatArea` rend `RepliedLine` avec `indent={41}` et `avatarCenter={9}` calculés pour l'avatar desktop (`w-10` + `-ml-[11px]`). Sur viewport étroit, le connecteur et le texte de la réponse paraissent décalés vers la gauche (déconnectés visuellement du message), et `MobileMessageBubble` (DM) utilise déjà ses propres valeurs (24/28). On va aligner les deux rendus mobile.

**Action** :
- `src/components/chat/ChatArea.tsx` : détecter mobile via `useIsMobile()` (déjà importé via hooks). Si mobile, passer à `RepliedLine` : `indent={28}`, `avatarCenter={14}` (alignés sur l'avatar mobile) + `className="mb-1 ml-1"` pour recoller le connecteur au-dessus de l'avatar.
- `src/components/mobile/dm/MobileMessageBubble.tsx` : recadrer les valeurs (`indent=20/24`, `avatarCenter=12/14`) selon `isOwn` pour que le connecteur démarre pile au-dessus de l'avatar 8×8 et que le texte de la réponse soit aligné avec le bord de la bulle (pas avec l'avatar).
- Aucune modif du `RepliedLine` lui-même.

## 2. Restructuration de l'écran Profil mobile

Fichier principal : `src/components/mobile/MobileProfileView.tsx`.

### 2a. Le bouton engrenage ouvre désormais la "vue profil détaillée"

- L'engrenage actuel (header `h-12`) n'ouvre plus `AccountSettingsModal`. Il ouvre une nouvelle sous-page `profile-detail` qui reprend **à l'identique** le style du `FullUserProfileModal` desktop (bannière, avatar, identité, bio, etc.) mais en plein écran mobile, intégré au stack `AnimatePresence` existant.
- Nouveau fichier : `src/components/mobile/profile/MobileFullProfileView.tsx` (réutilise les sous-composants visuels de `FullUserProfileModal`).

### 2b. Engrenage repositionné sur la bannière de chaque profil

- Dans la nouvelle `MobileFullProfileView` ET dans tous les profils utilisateurs visibles en mobile (popup profil d'un autre membre côté mobile s'il existe — sinon, uniquement la vue "Toi"), le bouton engrenage flotte en **haut-droite de la bannière** (absolute, `top-3 right-3`, bouton circulaire semi-transparent comme le pattern Discord).
- Le header `h-12` "Toi" en haut de `MobileProfileView` perd l'engrenage. Il garde uniquement le titre.

### 2c. Bouton "X" pour revenir en arrière

- Sur la bannière de `MobileFullProfileView`, en **haut-gauche** (`top-3 left-3`), un bouton "X" qui ferme la sous-page et restaure la dernière vue (utiliser le `subpage = null` + fallback `useNavigationState` si l'utilisateur arrive depuis une autre route).

### 2d. "Membre depuis" sous la bio

- Dans `MobileFullProfileView`, juste en dessous du bloc `Ma bio`, ajouter un bloc identique intitulé **"Membre depuis"** affichant `profile.created_at` (ou `user.created_at`) formaté en français (`format(date, 'd MMMM yyyy', { locale: fr })` via `date-fns`).
- Même style visuel que le bloc bio (carte arrondie `bg-muted/40`).

### 2e. Sections "Connections" (réseaux sociaux) à la place des sections actuelles

- Dans `MobileFullProfileView`, **remplacer** les sections "Compte", "Préférences", "Support" (sauf l'aperçu du profil lui-même) par **une seule section "Connections"**.
- Chaque connexion s'affiche : `[Icône réseau social] [Nom de domaine ou @username] [chevron pour éditer]`.
- Liste de réseaux supportés (exclure **TikTok** et **Snapchat**) :
  - Twitter/X, Instagram, YouTube, Twitch, Spotify, GitHub, GitLab, Reddit, LinkedIn, Steam, PlayStation, Xbox, Battle.net, Epic Games, Facebook, Discord, Bluesky, Mastodon, Threads, Website (custom domain).
- Stockage : nouvelle colonne `profile.connections jsonb` (array `{ provider: string, value: string }`).
- Nouveau composant `MobileConnectionsManager.tsx` (sous-page) pour ajouter/éditer/supprimer une connexion, déclenchée par un bouton "Ajouter une connexion".
- Icônes : utiliser les icônes Lucide existantes (`Twitter`, `Instagram`, `Youtube`, `Twitch`, `Github`, etc.) avec fallback sur un `Link` générique.

### 2f. Conservation des autres écrans

- La page "Toi" (`MobileProfileView`) garde : header, hero bannière+avatar, carte identité+stats, **et conserve les sections Compte/Préférences/Support/Logout existantes** (ce sont les écrans de gestion). Seule la "vue profil" est déplacée derrière l'engrenage.

## Section technique

- **Migration DB** : `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS connections jsonb NOT NULL DEFAULT '[]'::jsonb;` (RLS déjà en place sur `profiles`).
- **Types Supabase** régénérés après migration.
- **Mises à jour `useProfile` / `AuthContext`** : aucun changement structurel — `connections` arrive automatiquement avec le row profile.
- **Nouveau hook léger** `useUpdateConnections(connections)` (mutation Supabase `update profiles`).
- **Fichiers créés** :
  - `src/components/mobile/profile/MobileFullProfileView.tsx`
  - `src/components/mobile/profile/MobileConnectionsManager.tsx`
  - `src/lib/connections.ts` (registry des providers + icône + label + parseur d'URL/username)
- **Fichiers modifiés** :
  - `src/components/chat/ChatArea.tsx` (props `RepliedLine` mobile-aware)
  - `src/components/mobile/dm/MobileMessageBubble.tsx` (recalibrage indent/avatarCenter)
  - `src/components/mobile/MobileProfileView.tsx` (subpage `profile-detail`, retrait engrenage du header)
- **Hors scope** : aucun changement business logic, aucun changement desktop hors du fix `RepliedLine` côté mobile.
