## Corrections à apporter

Deux problèmes à corriger sans toucher aux icônes de copie existantes.

### 1. Annuler l'ajout d'icône copier dans le hero

Dans `src/components/profile/FullUserProfileModal.tsx` :
- Supprimer le bouton `Copy` ajouté dans l'overlay hero (lignes 191-202) — je n'aurais pas dû l'ajouter.
- Supprimer aussi l'import `Copy` de `lucide-react` s'il n'est plus utilisé.

### 2. Badge d'anniversaire visible sur tous les profils le jour J

Aujourd'hui la liste des badges lit uniquement `user_badges` en base. Le badge n'est inséré qu'au premier login du jour de l'utilisateur → il n'apparaît donc pas sur le profil d'un utilisateur qui n'a pas encore ouvert l'app aujourd'hui.

Solution : **injection virtuelle** du badge d'anniversaire côté UI, sans écriture en base, dès que `useIsBirthday(userId)` renvoie vrai.

Modifier :

**`src/components/badges/UserBadgeList.tsx`**
- Ajouter `import { useIsBirthday } from '@/hooks/useBirthday';`
- Récupérer `const isBirthday = useIsBirthday(userId);`
- Dans le `useMemo` qui construit `badges`, si `isBirthday` et qu'aucun badge avec `key === 'birthday'` n'est déjà présent, injecter en tête l'entrée du catalogue correspondante (`catalog.find(b => b.key === 'birthday')`).
- Ajouter `isBirthday` aux deps.
- Traiter aussi le cas `showEmpty` : si `isBirthday` et catalogue chargé mais rows vides, ne pas afficher "Aucun badge" — le badge virtuel compte.

**`src/components/badges/InlineBadgeStrip.tsx`**
- Même logique : injection virtuelle du badge `birthday` en tête de `badges` quand `useIsBirthday(userId)` est vrai et absent de la liste.

Le tooltip continue d'utiliser `useBirthdayGrantYears` : si aucun grant historique n'existe encore, il n'affiche simplement pas la ligne "Célébré en …", ce qui est cohérent.

### 3. Placement des badges (Mobile + Desktop)

Sur mobile, la carte identité de `MobileProfileView.tsx` (lignes 255-290) contient à droite la pile d'icônes copier (display_name + username). C'est l'endroit visé par la demande initiale.

**`src/components/mobile/MobileProfileView.tsx`**
- Dans la carte identité (autour de la ligne 266, colonne de droite), au-dessus des deux boutons copier existants, insérer :
  ```tsx
  <InlineBadgeStrip userId={profile?.id} max={4} className="mb-1 justify-end" />
  ```
- Import : `import { InlineBadgeStrip } from '@/components/badges/InlineBadgeStrip';`

**`src/components/profile/FullUserProfileModal.tsx` (Desktop/Tablette)**
- Supprimer complètement l'overlay hero `absolute top-2 right-3 …` (lignes 184-203).
- Dans la carte Identity (lignes 272-283), transformer l'en-tête en flex row : à gauche le bloc `display_name` + `@username` + pronoms, à droite `<InlineBadgeStrip userId={user.id} max={isMobile ? 3 : isTablet ? 4 : 5} className="justify-end shrink-0" />`.
- Supprimer aussi la section « Badges » séparée en dessous (lignes 286-289) puisque les badges sont maintenant dans l'identité — OU la garder pour l'affichage détaillé `size="lg"`. À conserver : elle donne la liste complète avec `showEmpty`.

### Fichiers touchés

- `src/components/badges/UserBadgeList.tsx` (injection badge virtuel)
- `src/components/badges/InlineBadgeStrip.tsx` (injection badge virtuel)
- `src/components/profile/FullUserProfileModal.tsx` (retirer bouton Copy, replacer strip dans Identity)
- `src/components/mobile/MobileProfileView.tsx` (ajout strip au-dessus des icônes copier)

Aucune migration, aucune écriture en base, aucun changement sur `UserProfilePopup` (le popup compact serveur continue d'utiliser `UserBadgeList` qui héritera automatiquement du badge virtuel).
