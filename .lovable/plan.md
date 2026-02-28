
Objectif: corriger définitivement l’alignement vertical du textarea dans la barre de saisie (vue serveur/chat), y compris quand le viewport change (clavier mobile) et quand l’overlay markdown est actif.

Constat précis (après lecture du code actuel)
- `MessageInput` est dans une row `flex items-center`, mais ses sous-éléments n’ont pas des hauteurs cohérentes:
  - bouton “+” non-compact: `p-3` (≈44px)
  - textarea non-compact: `py-2.5` + `line-height: 20px` (≈40px)
  - autres boutons (emoji/send): plus petits
- La hauteur du textarea est pilotée par `scrollHeight` brut (`adjustTextareaHeight`), sans hauteur plancher. Selon navigateur/device, la hauteur d’une ligne varie légèrement → impression visuelle “pas centré”.
- `InputMarkdownOverlay` n’a pas la même contrainte de hauteur min (`min-h-[24px]` actuellement), ce qui casse la synchronisation stricte textarea/overlay dans certains cas.

Approche de correction
1) Stabiliser une métrique verticale unique (et déterministe)
- Dans `MessageInput.tsx`, définir des hauteurs de base explicites:
  - non-compact: 40px (1 ligne)
  - compact: 28px
- Adapter `adjustTextareaHeight` pour appliquer:
  - `height = auto`
  - `height = clamp(scrollHeight, minHeight, maxHeight)`
- Résultat: la première ligne est toujours centrée de façon identique, quel que soit le device.

2) Uniformiser les hauteurs des contrôles autour du textarea
- Toujours dans `MessageInput.tsx`, passer les boutons d’action non-compact (`+`, emoji, send) sur une hauteur fixe cohérente (`h-10 w-10`, `p-0`, `min-h-0`, `flex items-center justify-center`).
- Garder le mode `compact` inchangé (ou minimalement ajusté) pour ne pas impacter les contexts compacts existants.
- Résultat: la row n’est plus “tirée” par un bouton plus haut que le textarea.

3) Resynchroniser overlay et textarea
- Dans `InputMarkdownOverlay.tsx`, aligner les min-heights et paddings avec le textarea:
  - non-compact → min-height 40px + padding vertical identique
  - compact → min-height 28px + padding vertical identique
- Conserver `OVERLAY_FONT_SIZE` et `OVERLAY_LINE_HEIGHT` (déjà corrects) pour éviter toute dérive de glyph metrics.

4) Prévenir l’effet des règles globales mobile
- Les règles globales mobile imposent un `min-height` sur `button`.
- Neutraliser localement sur les boutons du `MessageInput` via `min-h-0` + hauteur explicite, pour que la barre reste mathématiquement stable.

Fichiers à modifier
- `src/components/chat/MessageInput.tsx`
  - `adjustTextareaHeight` (clamp min/max)
  - classes des boutons d’action (hauteur fixe cohérente)
  - classes textarea (min-height explicite)
- `src/components/chat/InputMarkdownOverlay.tsx`
  - min-height + padding alignés sur textarea

Vérification (obligatoire)
1. Test end-to-end visuel dans un salon serveur:
- placeholder vide
- texte simple (1 ligne)
- texte multi-lignes
- markdown (pour activer overlay)
2. Vérifier en mobile (avec ouverture clavier) et desktop.
3. Confirmer que le texte/caret restent centrés et que les boutons ne “tirent” plus la hauteur de la barre.

Notes techniques
- Aucun changement backend.
- Aucun changement de logique d’envoi.
- Correction purement UI/metrics, ciblée et sans impact fonctionnel hors alignement.
