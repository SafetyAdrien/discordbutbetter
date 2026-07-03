## Objectif

Trois ajouts complémentaires à la section « Typographie des catégories » :
1. Bouton **Réinitialiser** pour revenir aux valeurs par défaut.
2. Meilleure accessibilité du **live preview** : annonce ARIA + focus visible par zone.
3. Nouvelle zone **Édition du profil** appliquant la casse aux libellés du formulaire de profil.

## 1. Bouton Réinitialiser

### Hook
- Modifier `src/hooks/useCategoryCasePreferences.ts` :
  - Exporter une fonction `resetAll()` qui `setCache(DEFAULT_CATEGORY_CASE_PREFS)` puis upsert la valeur par défaut vers `user_ui_preferences`.

### UI
- Modifier `src/components/appearance/CategoryCaseSection.tsx` :
  - Ajouter un bouton `Réinitialiser` (variante `ghost`, taille `sm`) à droite du titre.
  - Désactivé si `prefs` est déjà égal à `DEFAULT_CATEGORY_CASE_PREFS` (comparaison shallow zone par zone).
  - Confirmation via `AlertDialog` shadcn ("Réinitialiser la typographie ? Toutes les zones reviendront à l'apparence par défaut.") pour éviter un clic accidentel.

## 2. Accessibilité du live preview

Modifier `src/components/appearance/CategoryCaseLivePreview.tsx` :

- Wrapper principal `<aside role="region" aria-label="Aperçu en direct de la typographie des catégories">`.
- Chaque bloc devient focusable :
  - `tabIndex={0}`, `role="group"`, `aria-labelledby={id}`.
  - Classes focus visibles : `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background`.
- Ajouter une **live region** `<div aria-live="polite" aria-atomic="true" className="sr-only">` dans `CategoryCaseSection.tsx` qui se met à jour à chaque changement (`useEffect` sur `prefs`) avec un message du type :
  > « Aperçu mis à jour : Catégories de salons en majuscules, Édition du profil désactivé, … »
- Debounce léger (150 ms) via `setTimeout` pour éviter le spam d'annonces quand on clique successivement.
- Sur les 4 cartes de réglage (colonne gauche), améliorer aussi le focus des boutons `AG/ag/Ag/Aa` : ajouter `focus-visible:ring-2 focus-visible:ring-primary` (les défauts sont masqués globalement par `focus-ring-removal`, il faut réactiver explicitement ici).
- Titre de chaque bloc avec un `id` stable pour l'`aria-labelledby`.

## 3. Zone « Édition du profil »

### Extension du modèle
Modifier `src/lib/ui/categoryCase.ts` :
- Ajouter `'profileEdit'` à `CategoryCaseZone`.
- Ajouter aux constantes : `DEFAULT_CATEGORY_CASE_PREFS.profileEdit`, `ZONE_LABELS.profileEdit = "Libellés d'édition du profil"`, entrée dans `normalizePrefs`.
- Aucun changement de schéma DB : la colonne `category_case` est un `jsonb` libre.

### Ordre dans la section
Ajouter `'profileEdit'` en dernier dans `ZONE_ORDER` de `CategoryCaseSection.tsx`.

### Application
- Modifier `src/components/account-settings/ProfileSettingsTab.tsx` :
  - Importer `useCategoryCasePreferences` + `caseClass`.
  - Refactoriser `FieldLabel` (ligne 37) pour utiliser le hook et remplacer `uppercase` par un ternaire :
    `prefs.profileEdit.enabled ? caseClass('profileEdit', prefs) : 'uppercase'`
    → cela préserve l'apparence uppercase actuelle par défaut mais laisse l'utilisateur choisir Aa / Ag / ag.
  - Même traitement pour le `<Label>` "Connexions" ligne 373.

### Preview
Ajouter un 5ᵉ bloc dans `CategoryCaseLivePreview.tsx` :
- Titre bloc « Édition du profil »
- Mini formulaire factice avec 2 `FieldLabel` (« Nom d'affichage », « Pronoms ») + faux inputs, styles identiques à `ProfileSettingsTab.FieldLabel`, appliquant le même ternaire (uppercase par défaut).

## Fichiers touchés

- `src/lib/ui/categoryCase.ts` — ajout zone `profileEdit`.
- `src/hooks/useCategoryCasePreferences.ts` — expose `resetAll`.
- `src/components/appearance/CategoryCaseSection.tsx` — bouton reset + AlertDialog + live region + focus visible sur boutons.
- `src/components/appearance/CategoryCaseLivePreview.tsx` — a11y (roles, focus, aria-labelledby) + nouveau bloc profil.
- `src/components/account-settings/ProfileSettingsTab.tsx` — application de la casse aux `FieldLabel`.

## Hors périmètre

- Pas de nouvelle table / migration DB.
- Pas d'ajout d'autres zones (annonces, forum, etc.) — uniquement profil comme demandé.
- Pas de changement des raccourcis clavier.
