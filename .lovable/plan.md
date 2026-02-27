
Objectif: corriger definitivement le decalage overlay/textarea (caret + texte) sans changer le comportement fonctionnel du chat.

Constat apres lecture du code actuel
1) La couche overlay et la couche textarea n’utilisent pas exactement la meme geometrie de ligne.
- Dans `InputMarkdownOverlay.tsx`, certaines lignes ajoutent du decalage horizontal (`pl-3`, `px-2`) pour blockquote/code.
- Dans `MessageInput.tsx`, le textarea garde une geometrie differente et son style global est applique a toutes les lignes.
Resultat: le rendu visible et la position reelle du caret divergent.

2) Le modele d’affichage “texte transparent” est incoherent.
- Le textarea devient transparent si “au moins un markdown existe”.
- Mais dans l’overlay, les lignes `normal` sont rendues en `text-transparent`.
Resultat: lignes normales invisibles/mal perçues et impression de decalage.

3) Le montage overlay actuel (inline `span` + `\n`) est fragile pour les hauteurs variables.
- Les decorations de bloc (code/quote/list) sur des `span` inline provoquent des line-box differents du textarea.
Resultat: decalage vertical progressif.

Plan de correction (implementation)
A. Refaire la structure de rendu de l’overlay en lignes bloc
Fichier: `src/components/chat/InputMarkdownOverlay.tsx`
- Remplacer le rendu par ligne en `span + '\n'` par une liste de blocs (`div` ligne par ligne).
- Conserver la meme base typographique que le textarea (`text-sm`, line-height de base), puis surcharger uniquement les types qui changent la taille (h1/h2/h3/subtext).
- Pour blockquote/lists/code: garder l’effet visuel sans deplacer le point de depart du texte (decorations en pseudo-element/overlay visuel, pas de padding qui decale le texte saisissable).

B. Unifier la regle de visibilite texte
Fichier: `src/components/chat/MessageInput.tsx` + `InputMarkdownOverlay.tsx`
- Si markdown actif: textarea toujours `text-transparent caret-foreground`; overlay affiche TOUTES les lignes (y compris `normal`) en visible.
- Si pas de markdown: overlay null, textarea normal `text-foreground`.
- Supprimer la logique mixte actuelle qui masque certaines lignes des deux cotes.

C. Synchroniser strictement la geometrie overlay/textarea
Fichier: `src/components/chat/MessageInput.tsx`
- Appliquer les memes paddings/line-height de base sur les deux couches (compact et non-compact).
- Conserver le caret dynamique par ligne (`getLineTypeAtCursor`) mais limiter l’impact aux proprietes necessaires (fontSize + lineHeight du caret), sans introduire de decalage horizontal.
- Ajouter synchro de scroll explicite textarea -> overlay (sur `onScroll`) pour garder les deux couches superposees quand la zone atteint son max-height.

D. Finaliser les details visuels des separateurs titres/sous-titres
Fichier: `src/lib/markdown.tsx` (deja ajuste)
- Garder les separateurs renforces existants.
- Verifier coherence couleur/espacement avec le rendu overlay pour eviter sensation de “saut” entre saisie et message envoye.

Verification (checklist)
1) Cas simples: ligne normale seule, puis `#`, `##`, `###`, `-#`.
2) Cas mixtes multiline: titre + texte normal + liste + blockquote + code block.
3) Test compact et non-compact.
4) Test scroll sur long message (max-height atteint): caret et texte visibles restent colles.
5) Verification manuelle Firefox + Chromium (le decalage signale venait de Firefox).

Resultat attendu
- Plus aucun decalage visuel entre texte affiche, position du caret et zone de saisie.
- Markdown et non-markdown restent lisibles en permanence.
- Overlay enrichi (list/quote/code) sans casser l’alignement.
