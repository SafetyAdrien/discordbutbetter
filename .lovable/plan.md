

# Fix: Bio non visible dans la popup de profil utilisateur

## Problème

La bio (globale ou serveur) n'apparaît jamais dans la popup de profil car elle n'est ni récupérée de la base de données, ni transmise aux composants d'affichage.

## Cause racine

3 niveaux de données manquants :

1. **`useMembers.ts`** — La requête Supabase sur `profiles` ne sélectionne pas le champ `bio`
2. **`Index.tsx`** et **`MobileLayout.tsx`** — Le mapping `memberListData` ne transmet pas `bio` (ni `pronouns`, `createdAt`)
3. **`ChatArea.tsx`** — Le `handleUserClick` et le `onUserClick` construisent un objet `User` sans `bio`

## Plan

### 1. Ajouter `bio` à la requête Supabase (`useMembers.ts`)

- Ajouter `bio` dans le `select` de la jointure `profiles` (ligne 65-76)
- Ajouter `bio` au type `MemberWithProfile['user']`

### 2. Propager `bio` dans `memberListData` (`Index.tsx`)

- Ajouter `bio: m.serverProfile?.bio || m.user.bio || undefined` au mapping (ligne 438-449)
- Ajouter aussi `pronouns` et `createdAt` qui manquent également

### 3. Propager `bio` dans `memberListData` (`MobileLayout.tsx`)

- Même correction que Index.tsx (ligne 217-226)

### 4. Propager `bio` dans ChatArea (`ChatArea.tsx`)

- Le `UserProfilePopup` dans ChatArea reçoit `serverId`, donc il faut aussi passer le `bio` dans les objets User construits aux lignes 586-592 et dans `handleUserClick` (ligne 699-703)

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `src/hooks/useMembers.ts` | Ajouter `bio` au select et au type |
| `src/pages/Index.tsx` | Ajouter `bio`, `pronouns`, `createdAt` au mapping memberListData |
| `src/components/mobile/MobileLayout.tsx` | Idem |
| `src/components/chat/ChatArea.tsx` | Ajouter `bio` aux objets User construits pour la popup |

