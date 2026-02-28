
Objectif: corriger définitivement le centrage vertical du texte/placeholder dans le chat input Desktop (pas mobile), y compris quand l’overlay Markdown s’active.

Constat confirmé dans le code actuel
1. Le textarea Desktop est configuré avec `py-2.5`, `min-h-[40px]`, `line-height: 20px`, mais la hauteur réelle est recalculée via `scrollHeight` sur chaque changement (`adjustTextareaHeight`), avec seulement une borne basse (`Math.max(..., 40)`).
2. Sur Desktop, ce calcul peut produire une hauteur “1 ligne” légèrement supérieure à 40px selon la métrique de police/rendu navigateur, ce qui laisse visuellement le texte trop haut.
3. Le textarea + overlay utilisent `fontFamily: 'inherit'`. Or le body utilise `gg-sans` (avec tiret), alors que la police déclarée est `gg sans` (avec espace), ce qui peut basculer sur une fallback avec métriques verticales différentes.
4. L’alignement est donc instable/optique: “mathématiquement proche”, mais visuellement trop haut (cas placeholder + texte saisi).

Approche de correction (Desktop only, ciblée)
1) Verrouiller des métriques Desktop explicites et optiques
- Non-compact Desktop:
  - hauteur 1 ligne visée: 40px
  - padding vertical asymétrique léger pour correction optique (ex: `pt-[11px] pb-[9px]`), au lieu d’un `py-2.5` strict.
- Compact + mobile: inchangés.

2) Stabiliser le calcul de hauteur du textarea
- Dans `adjustTextareaHeight`:
  - conserver `height = auto` puis recalcul.
  - ajouter une logique “single-line baseline”:
    - tant que le `scrollHeight` reste dans une petite tolérance autour de la base Desktop, forcer 40px.
    - sinon croissance normale jusqu’à `max-h`.
- But: empêcher que la ligne unique “gonfle” légèrement et remonte visuellement le texte.

3) Fixer explicitement la famille de police du couple textarea/overlay
- Introduire une constante partagée (dans l’overlay) pour la famille de police utilisée par l’input:
  - `"gg sans", "Noto Sans", "Helvetica", sans-serif`
- L’appliquer au textarea ET à l’overlay (au lieu de `inherit`) pour obtenir des métriques identiques et prévisibles.

4) Garder la synchro overlay/textarea stricte
- Répliquer exactement le même padding Desktop et les mêmes min-heights dans `InputMarkdownOverlay.tsx`.
- Aucun changement de poids/size/line-height (on garde les règles déjà sécurisées).

Fichiers à modifier
1. `src/components/chat/MessageInput.tsx`
- Ajuster la logique de `adjustTextareaHeight` (baseline Desktop 1 ligne + tolérance + clamp max).
- Appliquer padding vertical Desktop corrigé (asymétrique) uniquement en non-compact desktop.
- Utiliser la même famille de police explicite que l’overlay.

2. `src/components/chat/InputMarkdownOverlay.tsx`
- Ajouter/utiliser la constante de font family partagée.
- Aligner padding/min-height Desktop avec le textarea (mêmes valeurs exactes).

Pourquoi cette approche va corriger “trop en haut”
- Elle corrige à la fois:
  1) l’effet visuel (padding optique Desktop),
  2) l’instabilité de hauteur 1 ligne (scrollHeight),
  3) les divergences de métriques de police (inherit/fallback).
- Donc le placeholder ET le texte tapé restent centrés de manière cohérente.

Vérification à faire après implémentation
1. Desktop (obligatoire)
- Placeholder vide: visuellement centré dans la barre.
- Texte 1 ligne: centré, sans effet “collé en haut”.
- Texte multi-lignes: croissance fluide sans décalage.
- Markdown (overlay actif): superposition parfaite, pas de saut vertical.

2. Régression rapide
- Mobile inchangé.
- Mode compact inchangé.
- Boutons adjacents inchangés fonctionnellement (envoi/emoji/+).

Notes techniques
- Aucun impact backend.
- Aucune modification du flux d’envoi.
- Correction strictement UI/metrics sur le chat input Desktop.
