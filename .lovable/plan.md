
## 1. Bannière Apparence — fluidité mobile

Actuellement le fondu applique un `filter: drop-shadow(...)` sur chaque pane pendant qu'on anime `opacity` — sur mobile bas de gamme cela déclenche un repaint filter par frame et provoque des saccades, surtout en thème clair (contraste plus fort).

Correctifs:
- Sur les panes: passer les couches en `transform: translateZ(0)` + `will-change: opacity`, retirer `filter: drop-shadow` pendant la transition et le remplacer par une ombre CSS `box-shadow` posée sur un wrapper (l'ombre "socle 5px" devient un `::after` avec `background: hsl(var(--background))`, 5px de haut, sous le pane). Résultat: pas de recomposition GPU des ombres à chaque frame.
- Réduire à 2 couches actives (avant/après) au lieu de 3 slides tous rendus en même temps: on ne rend que `SLIDES[index]` et `SLIDES[next]`, avec pré-décodage juste avant la bascule.
- Ajouter un fallback `IntersectionObserver`: la boucle `setInterval` ne tourne que si la bannière est visible dans le viewport (`isIntersecting`), pour ne pas gaspiller de CPU quand l'utilisateur scrolle plus bas dans les paramètres.
- Sur mobile (`useIsMobile`), passer le fondu de 900 ms → 500 ms et l'intervalle de 8 s → 6 s (plus perçu comme fluide sur petit écran).
- Respect strict de `prefers-reduced-motion`: on force `index=0` et on désactive tout.

## 2. Bannière — remplacer les typographies par de vraies UI (clair + sombre)

On retire les 9 PNG typographie/hero actuels et on reconstruit **6 scènes en JSX pur** (2 scènes × 3 moments) qui s'affichent dans la bannière — pas d'images bitmap, donc net à toutes densités, cohérent avec le thème sélectionné, et léger:

Les 3 moments dans l'ordre:
- **Moment 1 — Interface globale**: mini rendu du server layout (barre serveurs + ChannelList + zone Chat + MemberList), style dark.
- **Moment 2 — Profil + Paramètres utilisateur**: la carte profil (bannière/avatar/statut/badges) empilée sur un extrait du modal Settings (sidebar + section active), style clair pour bien montrer le light theme.
- **Moment 3 — DMs**: liste DMs + conversation active avec bulles, style dark.

Chaque scène = 3 mini "Pane" React (composants légers, `pointer-events:none`, `aria-hidden`), positionnés en cascade, avec:
- couleurs 100% issues des tokens sémantiques (`hsl(var(--surface-1))`, `--sidebar-background`, `--foreground`, …) → suit le thème réel de l'app.
- Chaque scène a une prop `forcedTheme?: 'light' | 'dark'` optionnelle qui applique localement `.dark`/`:root` via un wrapper `<div class="dark">` ou `<div class="light-scope">`, pour montrer les deux modes dans une seule bannière (moment 2 = clair).
- Socle 5 px via `::after` (voir §1).

Fichier neuf: `src/components/appearance/preview-scenes/{SceneGlobal.tsx, SceneProfileSettings.tsx, SceneDMs.tsx}`. `AppearancePreviewBanner.tsx` réécrit pour orchestrer les scènes JSX au lieu des `<img>`.

## 3. Thème clair — Popups de profil

Fichiers concernés (audit rapide déjà fait): `src/components/profile/UserProfilePopup.tsx`, `UserProfileCard.tsx`, `FullUserProfileModal.tsx`, et le bouton "user pill" en bas à gauche de `ChannelList.tsx`.

Correctifs (uniquement présentation, pas de logique):
- Remplacer les fonds durs (`bg-[#111214]`, `bg-black/…`, `bg-zinc-900`, `bg-neutral-900`) par `bg-popover` / `bg-card` / `bg-surface-2`.
- Remplacer `text-white` génériques par `text-foreground`, et les `text-zinc-400` par `text-muted-foreground`.
- Bordures `border-black/…` → `border-border`.
- Bannière profil vide: dégradé actuel `from-black` → `from-muted`.
- User pill (ChannelList bas gauche): fond passe à `bg-sidebar-accent` / `bg-surface-2`, hover `hover:bg-surface-3`, texte `text-foreground`, séparateur `border-border`.
- Vérif visuelle Playwright en clair (screenshots avant/après des 3 surfaces).

## 4. Thème personnalisé — bandeau + éditeur

### 4.1 Bandeau (sous les cartes Sombre/Clair)
Nouveau composant `CustomThemeBanner.tsx` reproduisant le style de l'image 1: fond gradient sombre, mini-mockup à gauche, titre "Personnalise ton thème", sous-titre "Crée ton propre thème pour rendre NexusChat vraiment à toi.", bouton primaire "Essayer" à droite. Ouvre `CustomThemeEditor` (drawer plein écran sur mobile, side sheet sur desktop, largeur ~380 px, calqué sur la vidéo).

### 4.2 Éditeur `CustomThemeEditor.tsx`
Colonne droite, éléments repris de la vidéo:
- Toggle "Apparence" (soleil / lune) → base sur laquelle on teinte.
- **Colors**: liste de "color chips" (par défaut 1 chip). Chip actif = couleur en cours d'édition. Bouton `+ Add Color` (max 3 chips → 3 stops de gradient).
- Sélecteur HSV visuel (carré saturation/valeur + slider hue + swatch + input hex).
- Slider "Color intensity" (0–100 %) → applique l'opacité de la teinte sur le fond.
- Slider "Gradient direction" (0–360°) visible seulement si ≥ 2 chips.
- Boutons "Surprise Me!" (randomize) et "Reset".
- Footer: "Back" | "Apply".

### 4.3 Application du thème & optimisation performance
Point critique de la demande. Le rendu vidéo (gradient plein écran qui suit la souris) est coûteux si on repeint chaque composant.

Stratégie:
- Un **seul** overlay CSS `<div id="custom-theme-tint" />` monté une fois dans `App.tsx`, positionné `fixed inset-0 pointer-events-none z-[-1]`. Il porte tout le gradient (`background: linear-gradient(var(--ct-angle), var(--ct-color-1), var(--ct-color-2), …)`). Les composants restent inchangés → 0 re-render React quand on bouge le picker.
- Les variables `--ct-*` sont écrites directement en DOM (`document.documentElement.style.setProperty`) depuis l'éditeur, throttlées à `requestAnimationFrame` (une seule écriture par frame).
- Les surfaces (`--background`, `--surface-1`, `--sidebar-background`, `--popover`) restent semi-transparentes vers le fond via `hsl(var(--…) / var(--surface-alpha))` calculées **une fois** au montage du thème custom (nouveau bloc CSS `html.custom-theme { … }`), pas à chaque frame.
- Le picker HSV utilise un `<canvas>` (pas un dégradé DOM par pixel) et met à jour via `pointermove` avec `requestAnimationFrame` throttle + `will-change: transform` sur le curseur.
- Le "Preview Theme" mémorisé: on ne persiste en DB (`user_ui_preferences`) qu'au clic sur `Apply`, sinon on reste en mémoire. Debounce 400 ms sur les changements du slider intensity avant d'écrire les tokens dérivés.
- Le custom theme est désactivé automatiquement si `prefers-reduced-motion` ou si l'onglet est en background (`visibilitychange`) pour éviter les repaints en tâche de fond.
- Storage: nouvelle colonne JSON `custom_theme` dans `user_ui_preferences` (`{ mode, chips: string[], intensity, angle }`). Synchro cross-device déjà en place via le hook existant.

### 4.4 "Share custom theme" (dernier écran de la vidéo)
Bouton "Share" ouvre un modal listant les salons du serveur courant avec cases à cocher et un champ "Add an optional message" — envoie un message système contenant un JSON encodé dans un lien `nexuschat://apply-theme?data=…`. **Hors scope de ce chantier**: on prévoit juste le point d'accroche (`onShare`) mais on implémente le modal dans une itération suivante — je veux d'abord ton feu vert sur les points 1–4.3.

## Fichiers touchés (résumé)
- Nouveaux: `AppearancePreviewBanner.tsx` (réécrit), `preview-scenes/SceneGlobal.tsx`, `SceneProfileSettings.tsx`, `SceneDMs.tsx`, `CustomThemeBanner.tsx`, `CustomThemeEditor.tsx`, `useCustomTheme.ts`, `CustomThemeTintLayer.tsx`.
- Modifiés: `AppearanceSettings.tsx` (ajoute bandeau custom sous les cartes), `App.tsx` (monte le tint layer), `index.css` (bloc `html.custom-theme`), `ChannelList.tsx` (user pill), `UserProfilePopup.tsx`, `UserProfileCard.tsx`, `FullUserProfileModal.tsx` (tokens sémantiques).
- Supprimés: les 9 PNG de bannière dans `src/assets/appearance-banner/`.
- Migration DB: `ALTER TABLE public.user_ui_preferences ADD COLUMN custom_theme jsonb` (RLS déjà scoppée user).

## Validation
1. `bun run build` sans erreurs.
2. Playwright: capturer la bannière en clair et sombre (desktop + viewport mobile 390×844) et vérifier les 3 scènes.
3. Playwright: ouvrir un popup profil en thème clair, screenshot, vérif contraste.
4. Playwright: ouvrir l'éditeur custom, bouger le hue, mesurer FPS via `performance.now()` (< 16 ms/frame en moyenne sur 60 frames).
