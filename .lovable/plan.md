
# Profils par serveur - "Modifier son profil serveur"

## Concept
Permettre a chaque utilisateur d'avoir un profil personnalise par serveur (nom d'affichage, avatar, banniere, bio, pronoms) sans affecter son profil global. Comme Discord avec les "Server Profiles".

## 1. Nouvelle table `server_profiles`

Creer une table pour stocker les overrides par serveur :

```text
server_profiles
  - id (uuid, PK)
  - user_id (uuid, NOT NULL)  
  - server_id (uuid, NOT NULL)
  - display_name (text, nullable)
  - avatar_url (text, nullable)
  - banner_url (text, nullable)
  - bio (text, nullable)
  - pronouns (text, nullable)
  - created_at (timestamptz)
  - updated_at (timestamptz)
  - UNIQUE(user_id, server_id)
```

Politiques RLS :
- SELECT : les membres du serveur peuvent voir les profils serveur des autres membres
- INSERT/UPDATE : uniquement son propre profil (`auth.uid() = user_id`)
- DELETE : uniquement son propre profil

## 2. Hook `useServerProfile`

Nouveau fichier `src/hooks/useServerProfile.ts` :
- `useServerProfile(userId, serverId)` : recupere le profil serveur (avec fallback sur le profil global)
- `useUpdateServerProfile()` : mutation pour creer/mettre a jour un profil serveur
- `useUploadServerAvatar()` : upload d'avatar specifique au serveur (bucket `avatars`, chemin `{userId}/server-{serverId}.ext`)
- `useUploadServerBanner()` : upload de banniere specifique (bucket `banners`, chemin `{userId}/server-{serverId}.ext`)

## 3. Modal d'edition du profil serveur

Nouveau composant `src/components/profile/ServerProfileEditModal.tsx` :
- En-tete avec select menu pour choisir le serveur a modifier (liste des serveurs rejoints)
- Formulaire : Nom d'affichage, Avatar, Banniere, Bio, Pronoms
- Chaque champ montre un placeholder avec la valeur du profil global
- Bouton "Reinitialiser" pour supprimer un override et revenir au profil global
- Apercu en temps reel du profil serveur

## 4. Points d'entree (acces a la fonctionnalite)

### A. Menu contextuel sur son propre profil dans la liste des membres
Dans `MemberList.tsx`, ajouter une option dans le `ContextMenu` quand l'utilisateur fait un clic-droit sur son propre profil :
- Nouvelle entree avec icone Pencil : "Modifier le profil serveur"
- Ouvre directement le `ServerProfileEditModal` pre-selectionne sur le serveur actuel

### B. Icone pinceau dans la banniere de la popup profil
Dans `UserProfilePopup.tsx`, quand l'utilisateur consulte son propre profil :
- Ajouter une icone pinceau en haut a droite de la banniere (a cote des icones existantes message/ami)
- Cliquer ouvre le `ServerProfileEditModal`

### C. Depuis les parametres du profil
Dans `ProfileSettings.tsx`, ajouter un lien/bouton "Profils serveur" qui ouvre le modal avec le select menu pour choisir le serveur

## 5. Affichage des profils serveur

Modifier les composants qui affichent les profils pour utiliser les overrides :
- `MemberList.tsx` : quand on affiche un membre, verifier s'il a un `server_profile` pour ce serveur et utiliser ses valeurs en priorite
- `UserProfilePopup.tsx` : afficher le profil serveur quand on est dans un contexte serveur
- `useMembers.ts` : enrichir les donnees membres avec les profils serveur

## Details techniques

### Fichiers crees
- `src/hooks/useServerProfile.ts`
- `src/components/profile/ServerProfileEditModal.tsx`

### Fichiers modifies
- `src/components/layout/MemberList.tsx` : ajout de l'option context menu + utilisation des profils serveur
- `src/components/profile/UserProfilePopup.tsx` : ajout de l'icone pinceau pour son propre profil
- `src/components/profile/ProfileSettings.tsx` : lien vers les profils serveur
- `src/hooks/useMembers.ts` : jointure avec `server_profiles` pour enrichir les donnees

### Migration SQL
- Creation de la table `server_profiles` avec contrainte unique, RLS, et publication realtime
