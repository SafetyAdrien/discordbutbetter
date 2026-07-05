
## Objectif

Faire enfin apparaître un indicateur visuel discret d'anniversaire autour de la photo de profil d'un utilisateur, partout où sa PdP est affichée (listes de membres, DM, modals de profil, éditeur de profil, mini-cartes, etc.). Pas d'envahissement de l'avatar : un fin anneau doré + une petite icône cadeau posée sur le tracé.

## Ce qui cloche aujourd'hui

Dans `src/components/ui/user-avatar-image.tsx`, les props `showBirthdayCrown` / `birthdayCrownSize` sont déclarées et documentées, mais le corps du composant se contente de `void showBirthdayCrown; void birthdayCrownSize;`. `BirthdayAvatarCrown` n'est jamais importé, `useIsBirthday` n'est jamais appelé, donc rien ne s'affiche autour des avatars le jour d'un anniversaire — alors que tous les appelants passent déjà `ownerId`.

## Spec visuelle

- **Anneau doré** entourant l'avatar, épaisseur **maximum 5px**, débordant vers l'extérieur du cercle (n'empiète pas sur l'image). Dégradé conique doré déjà en place, animation de rotation lente (`animate-spin` 8s).
- **Icône `Gift`** (Lucide, dorée, remplie), petite, posée **sur le tracé de l'anneau à 12h** (haut, centrée horizontalement). Elle ne tourne pas avec l'anneau — reste fixe.
- Aucun emoji 🎂 sur l'avatar (le ruban + le badge s'en chargent déjà).
- La pastille de statut en bas-droite reste totalement intacte, aucun risque de collision (icône en haut).

## Ce qu'on va faire

1. **Réécrire `src/components/profile/BirthdayAvatarCrown.tsx`** :
   - Garder l'anneau doré tournant, épaisseur ~3-4px (bien sous les 5px demandés), `inset-[-4px]` + masque radial pour ne laisser que la couronne visible.
   - Supprimer le bloc `<span>🎂</span>` et la table `CAKE_SIZE`.
   - Ajouter une petite icône `<Gift />` (Lucide) positionnée en absolu **en haut centré** de l'avatar, chevauchant le tracé de l'anneau : `absolute top-[-6px] left-1/2 -translate-x-1/2`, taille ~12px, `text-[#f5b301]`, remplie (`fill="currentColor"`), avec un léger `drop-shadow` doré pour le décoller du fond. `z-10`, `pointer-events-none`.
   - L'icône reste statique pendant que l'anneau tourne derrière elle.
   - Simplifier l'API : plus de prop `size` (une seule variante propre qui s'adapte via `inset` relatif au parent).

2. **Câbler `src/components/ui/user-avatar-image.tsx`** :
   - Importer `BirthdayAvatarCrown` et `useIsBirthday`.
   - Retirer les `void ...;`.
   - Appeler `const isBirthday = useIsBirthday(ownerId ?? null);`.
   - Si `showBirthdayCrown && isBirthday`, rendre `<BirthdayAvatarCrown />` comme frère du `<div className="absolute inset-0 overflow-hidden rounded-full">` — le wrapper racine est déjà `overflow-visible`, donc l'anneau et l'icône Gift débordent proprement sans être clippés.
   - Garder la prop `showBirthdayCrown` (default `true`) pour pouvoir l'éteindre sur les très petits avatars (typing indicator, aperçus 16-20px) où l'anneau serait illisible.
   - Supprimer `birthdayCrownSize` devenu inutile.

3. **Portée automatique** : tous les endroits qui affichent une PdP passent déjà par `UserAvatarImage` avec `ownerId` (listes de membres, DM, `FullUserProfileModal`, `UserProfilePopup`, `MobileProfileView`, etc.). Câbler le composant suffit — aucun appelant à modifier.

4. **Éditeur de profil** : vérifier que l'aperçu d'avatar dans l'éditeur passe bien par `UserAvatarImage` avec l'`ownerId` de l'utilisateur courant. Si un `<img>` brut ou un `<Avatar>` shadcn direct est utilisé, le remplacer par `UserAvatarImage` pour hériter du comportement.

5. **Éteindre l'anneau ponctuellement** sur les avatars trop petits (< ~24px) où il serait illisible : passer `showBirthdayCrown={false}` aux endroits concernés (typing indicator, thumbs de liste compacte, etc.). À identifier lors de la vérification visuelle.

6. **Vérification visuelle** via Playwright sur un profil dont l'anniversaire est aujourd'hui : capture d'une liste de membres, d'un DM, du `FullUserProfileModal`, du `MobileProfileView` (viewport 360×590) et de l'éditeur de profil. Confirmer que :
   - l'anneau doré tourne bien autour de la PdP
   - la petite icône Gift est bien centrée en 12h sur le tracé, ne tourne pas
   - la pastille de statut en bas-droite n'est pas touchée
   - le contenu de l'avatar n'est pas rogné

## Détails techniques

- `useIsBirthday` est déjà mis en cache 1h côté React Query (RPC `is_birthday_today`), donc l'appeler dans chaque `UserAvatarImage` est sans coût — déduplication automatique par `queryKey: ['is-birthday', userId]`.
- Le wrapper racine du composant est déjà `overflow-visible` ; anneau et icône débordent sans être clippés.
- Le masque radial (`WebkitMask` / `mask`) laisse l'intérieur du cercle transparent, l'anneau n'obscurcit pas l'image.
- L'icône `Gift` de Lucide accepte `fill="currentColor"` pour un rendu doré plein plutôt que trait, plus lisible à 12px.
- Aucun changement de schéma, ni de RLS, ni de RPC. Purement présentationnel.

## Fichiers touchés

- `src/components/profile/BirthdayAvatarCrown.tsx` — anneau fin + icône Gift en 12h, API simplifiée.
- `src/components/ui/user-avatar-image.tsx` — câbler `useIsBirthday` + `BirthdayAvatarCrown`.
- Ponctuellement : composant de l'éditeur de profil si son avatar n'utilise pas déjà `UserAvatarImage` (à confirmer en build mode), et 1–2 endroits micro-avatars où on désactivera l'anneau via `showBirthdayCrown={false}`.
