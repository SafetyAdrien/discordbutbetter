## Objectif

Rendre l'ouverture du thème personnalisé fidèle à la vidéo : le side sheet glisse depuis la droite **par-dessus** l'interface qui reste **entièrement visible** derrière (settings modal + app), et retirer le toggle inutile de la bannière.

## Changements

### 1. `src/components/appearance/CustomThemeBanner.tsx`
- Supprimer le composant `<Switch>` et le label "Actif" à droite du bouton "Personnaliser".
- Ne garder que le libellé + le pill "Personnaliser" comme unique CTA.
- Retirer les imports devenus inutiles (`Switch`, `useCustomTheme`, `setCommittedEnabled`).

### 2. `src/components/appearance/CustomThemeSheet.tsx`
Refonte du wrapper pour reproduire le comportement de la vidéo :
- **Ne plus utiliser** le `<Sheet>` / `<Drawer>` de shadcn (qui posent un overlay opaque, verrouillent le scroll et volent le focus au `AccountSettingsModal` sous-jacent).
- Le remplacer par un panneau fixe custom :
  - Position `fixed inset-y-0 right-0`, largeur `420px` desktop / `100vw` mobile.
  - `z-[60]` pour passer au-dessus du modal settings (`z-50`) sans le masquer.
  - **Aucun overlay/backdrop** : l'utilisateur voit l'app derrière et l'aperçu s'applique en live sur tout ce qui est visible.
  - Animation d'entrée/sortie : `translate-x-full → translate-x-0` (transition 280ms `ease-out`), respect de `prefers-reduced-motion`.
  - Body scroll **non verrouillé** (contrairement à Sheet/Drawer) pour laisser interagir avec l'app derrière.
  - Focus non piégé (pas de `FocusScope trapped`) : `Escape` ferme le panneau, mais l'utilisateur peut cliquer ailleurs sans fermeture automatique — comme dans la vidéo.
  - Ombre portée douce à gauche pour détacher visuellement le panneau.
- Header, contenu (picker/chips/sliders) et footer inchangés — seule l'enveloppe change.
- Portail via `createPortal(document.body)` pour éviter les problèmes de stacking avec le modal parent.

### 3. `src/components/account-settings/AccountSettingsModal.tsx` (vérification uniquement)
- S'assurer que le `Dialog` du modal settings n'utilise pas de `modal={true}` strict qui empêcherait le panneau d'être interactif. Ajuster si nécessaire (`onInteractOutside={e => e.preventDefault()}` pour éviter la fermeture du modal quand on clique dans le panneau).

## Comportement final

- Clic sur **Personnaliser** → panneau glisse depuis la droite.
- L'interface complète (channel list, chat, settings modal) reste visible et se teinte en temps réel selon la palette en cours d'édition.
- Fermeture : bouton "Fermer/Annuler", touche `Escape`, ou clic sur "Appliquer".
- Le toggle on/off du thème reste disponible **à l'intérieur** du panneau (section existante "Activer le thème personnalisé").

## Détails techniques

- Portail `createPortal` monté sur `document.body`.
- `useEffect` pour ajouter/retirer un listener `keydown` (`Escape`).
- Pas de `pointer-events: none` sur le body → l'utilisateur peut toujours défiler et cliquer dans l'app derrière.
- Suppression complète du `Drawer` mobile : sur mobile, le même panneau prend `w-full` (100vw) mais garde le même mécanisme, cohérent avec la vidéo.
