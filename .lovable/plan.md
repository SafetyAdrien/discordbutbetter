## Objectif
Reprendre **toute la logique de la vidéo** pour le thème personnalisé : un vrai flow Discord-like avec side sheet, HSV picker, chips multi-stops, sliders, Preview/Apply, Surprise Me, Reset, et écran Share final. Persistance locale + sync cross-device via `user_ui_preferences.custom_theme`. Suppression complète de l'éditeur inline actuel.

## 1. Suppression de l'existant
- Supprimer `src/components/appearance/CustomThemeEditor.tsx` (inline).
- Retirer son montage dans `AppearanceSettings.tsx` — seul le `CustomThemeBanner` reste, et son clic ouvre désormais la side sheet.
- `CustomThemeTintLayer` monté globalement dans `App.tsx` : inchangé (déjà en place).

## 2. Nouvelle side sheet — `CustomThemeSheet.tsx`
Basée sur `Sheet` (shadcn), largeur `sm:max-w-[400px]`, plein écran sur mobile. Reproduit écran par écran la vidéo :

### 2.1 Header
- Titre "Thème personnalisé".
- Toggle **Apparence base** (Sun / Moon) — définit sur quelle base (`light`/`dark`) le custom theme s'applique.
- Bouton close.

### 2.2 Section "Couleurs" — chips multi-stops
- Liste horizontale de chips (1 à 3 max). Chip actif = celui en cours d'édition (bordure ring primary).
- Bouton `+ Add Color` (disabled si 3 chips).
- Clic droit / bouton X sur un chip = suppression (si > 1).
- Drag pour réordonner (dnd-kit) → change l'ordre des stops.

### 2.3 HSV Picker complet — `HsvColorPicker.tsx`
Remplace `<input type="color">` par un vrai picker visuel :
- **Carré Saturation/Value** : `<canvas>` 240×160, curseur draggable, mise à jour rAF-throttlée.
- **Slider Hue** horizontal (0–360°) rendu en canvas (dégradé arc-en-ciel).
- **Input Hex** éditable + preview swatch.
- **Eyedropper** (bouton) utilisant `window.EyeDropper` si dispo, sinon caché.
Sortie : hex → écrit dans le chip actif via `setChip`.

### 2.4 Sliders
- **Color intensity** (0–100%) : opacité de l'overlay `--ct-intensity`.
- **Gradient direction** (0–360°) : visible seulement si ≥ 2 chips. Affichée avec mini-preview de flèche pivotante.

### 2.5 Boutons secondaires
- **Surprise Me!** : randomise chips (2–3, harmonies analogues/complémentaires), angle, intensité 40–85%.
- **Reset** : retour à `DEFAULT_CUSTOM_THEME`.

### 2.6 Footer
- **Back** : annule toute modification depuis l'ouverture (restaure snapshot pris à l'ouverture).
- **Apply** : persiste en localStorage + upsert `user_ui_preferences.custom_theme`.
- **Share** (icône) : ouvre l'écran Share.

### 2.7 Mode Preview
Toutes les modifs dans la sheet sont "preview only" : écriture DOM live via rAF (déjà en place), mais **pas d'écriture localStorage/DB** tant que Apply n'est pas cliqué. Un snapshot `initialThemeRef` capturé à l'ouverture permet à Back de restaurer.

## 3. Écran Share — `ShareCustomThemeDialog.tsx`
Ouvert depuis le footer de la sheet. Contenu conforme au dernier écran de la vidéo :
- Titre "Partager ton thème".
- Liste des salons text du serveur courant (checkboxes, recherche filtrante).
- Textarea "Add an optional message" (optionnelle, max 500 char).
- Preview du "theme card" qui sera envoyée.
- Bouton **Send** : pour chaque salon sélectionné, insert dans `messages` un message contenant :
  - le message optionnel
  - un lien magique `nexuschat://apply-theme?data=<base64url({mode,chips,intensity,angle})>`
  - rendu enrichi côté chat via nouvelle `ThemeCardEmbed` (dépendance markdown détectée sur le lien `nexuschat://apply-theme`).
- Réception : clic sur "Apply this theme" dans la card → ouvre la sheet en preview avec le thème décodé + Apply/Ignore.

## 4. Persistance cross-device
### Migration DB
```sql
ALTER TABLE public.user_ui_preferences
  ADD COLUMN IF NOT EXISTS custom_theme jsonb;
```
Pas de nouvelle policy nécessaire (les policies existantes couvrent déjà toutes les colonnes du user courant).

### Hook `useCustomTheme.ts` (mis à jour)
- Au mount : SELECT `custom_theme` pour l'utilisateur courant → si présent, prime le cache module (prioritaire sur localStorage).
- À l'Apply : upsert `{ user_id, custom_theme }`.
- Realtime : subscribe `postgres_changes` sur `user_ui_preferences` filtré `user_id=eq.<uid>` → applique automatiquement sur un autre device.

## 5. Performance (critères vidéo)
- **1 seul overlay `fixed inset-0`** déjà en place — inchangé.
- Écritures DOM rAF-throttlées, `useSyncExternalStore` déjà en place — inchangé.
- **Canvas HSV** : redraw seulement quand la hue change (pas à chaque mousemove du curseur SV, qui ne modifie que la position du curseur, pas le canvas).
- **`will-change: transform`** sur les curseurs draggables, `pointer-events: none` sur les couches non-interactives.
- **Pause visibilitychange** déjà en place — inchangé.
- **Debounce 300ms** sur écriture DB (uniquement sur Apply, donc pas de spam).
- **prefers-reduced-motion** : désactive l'overlay entièrement.

## 6. Intégration bandeau existant
`CustomThemeBanner.tsx` :
- Bouton "Essayer" → ouvre `<CustomThemeSheet />`.
- Si un custom theme est déjà activé, le bouton devient "Modifier" et une pastille "Actif" s'affiche.

## 7. Fichiers touchés
**Nouveaux :**
- `src/components/appearance/CustomThemeSheet.tsx`
- `src/components/appearance/HsvColorPicker.tsx`
- `src/components/appearance/ShareCustomThemeDialog.tsx`
- `src/components/chat/embeds/ThemeCardEmbed.tsx`
- `src/lib/customTheme/encode.ts` (base64url encode/decode du payload)

**Modifiés :**
- `src/hooks/useCustomTheme.ts` : ajout SELECT initial, Apply=persist(DB), snapshot/restore, realtime sync.
- `src/components/appearance/AppearanceSettings.tsx` : retire l'inline editor, garde le bandeau.
- `src/components/appearance/CustomThemeBanner.tsx` : ouvre la sheet, état "actif".
- `src/lib/markdown.tsx` : détection de `nexuschat://apply-theme?data=…` → rendu `<ThemeCardEmbed />`.

**Supprimés :**
- `src/components/appearance/CustomThemeEditor.tsx`.

**Migration DB :**
- Ajout colonne `custom_theme jsonb` sur `user_ui_preferences`.

## 8. Validation
1. `bun run build` propre.
2. Playwright desktop : ouvrir la sheet, dragger le SV canvas, vérifier tint live sans re-render (perf trace < 16 ms/frame).
3. Playwright mobile 390×844 : sheet devient plein écran, footer sticky Back/Apply visible.
4. Preview/Apply : sans Apply, refresh → thème par défaut restauré. Avec Apply → thème persiste.
5. Cross-device : ouvrir 2 sessions, Apply sur l'une → l'autre reçoit via realtime.
6. Share : envoi dans un salon → card apparaît, clic "Apply" ouvre la sheet en preview du thème reçu.
