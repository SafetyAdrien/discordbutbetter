
Objectif: corriger définitivement le décalage overlay/textarea (surtout Firefox) sans perdre les markdowns déjà ajoutés dans l’input.

Constat précis après audit
1) Le “contrat de métriques” n’est pas strict entre les 2 couches.
- `InputMarkdownOverlay.tsx` garde des variations qui changent la géométrie du texte (`font-bold`, `font-semibold`, `font-mono`).
- Le textarea reste en métriques régulières.
- Résultat: en Firefox, largeur des glyphes + position du caret divergent (effet “décalé” même si taille/line-height sont identiques).

2) Le modèle de scroll actuel est fragile.
- Le scroll est porté par le conteneur parent (`overflow-y-auto`) alors que l’overlay est en `absolute inset-0`.
- Cette combinaison est notoirement instable cross-browser pour des couches superposées (position visuelle vs texte natif/caret).

3) La logique caret dynamique est devenue inutilement complexe.
- `caretFontSize/caretLineHeight` sont encore calculés, mais n’apportent plus de bénéfice réel avec le mode “métriques uniformes”.
- Cela augmente les rerenders pendant la saisie et peut accentuer la sensation de jitter.

Plan d’implémentation
1) Verrouiller un “style métrique unique” partagé
Fichiers:
- `src/components/chat/InputMarkdownOverlay.tsx`
- `src/components/chat/MessageInput.tsx`

Actions:
- Créer une base commune strictement identique entre overlay et textarea:
  - `text-sm`
  - `leading-5`
  - `font-normal`
  - `tracking-normal`
  - mêmes paddings (`py/pr/pl`) explicites
  - `box-border`
- Supprimer dans l’overlay toute variation qui modifie la largeur des glyphes:
  - retirer `font-bold/font-semibold/font-mono` des line styles de rendu input.
- Conserver la mise en évidence markdown uniquement via couleurs + décorations visuelles (pas via changements de police/poids).

2) Rebasculer sur un scroll natif textarea + synchronisation overlay
Fichier:
- `src/components/chat/MessageInput.tsx`

Actions:
- Faire porter le scroll vertical au textarea (et non au parent):
  - parent: `overflow-hidden`
  - textarea: `max-h-* + overflow-y-auto`
- Synchroniser overlay avec `textarea.scrollTop` sur `onScroll`.
- Réinitialiser scroll/hauteur proprement au reset du message (après envoi / contenu vide).

3) Rendre les décorations markdown “non intrusives” (sans décaler le texte)
Fichiers:
- `src/components/chat/InputMarkdownOverlay.tsx`
- `src/index.css`

Actions:
- Garder blockquote/list/code dans l’overlay, mais en décorations absolues/pseudo-éléments qui n’ajoutent pas de padding structurel.
- Si indentation visuelle nécessaire, elle doit être “overlay-only” (absolue), sans déplacer le point de départ du texte tapé.
- Maintenir les séparateurs titres/sous-titres visibles dans les messages envoyés (déjà améliorés) et harmoniser la teinte côté input sans changer les métriques.

4) Simplifier la logique caret pour stabiliser Firefox
Fichier:
- `src/components/chat/MessageInput.tsx`

Actions:
- Supprimer (ou neutraliser proprement) `caretFontSize/caretLineHeight` et les callbacks associés tant que toutes les lignes utilisent les mêmes métriques.
- Garder uniquement la logique de transparence texte:
  - markdown actif => textarea `text-transparent caret-foreground`, overlay affiche toutes les lignes
  - pas de markdown => overlay masqué, textarea `text-foreground`

Détails techniques ciblés (changements attendus)
- `InputMarkdownOverlay.tsx`
  - `lineStyles`:
    - headers/subtext/code/list/quote: plus de poids ou famille de police différente
    - uniquement `text-foreground/text-muted-foreground` + classes décoratives
  - base class overlay: mêmes paddings exacts que textarea (`compact` et non-compact)
- `MessageInput.tsx`
  - conteneur overlay/textarea: `overflow-hidden` (plus `overflow-y-auto` parent)
  - textarea: `overflow-y-auto` + `max-h-[...]`
  - ajouter `onScroll` pour copier `scrollTop` vers overlay
  - nettoyer états caret inutilisés
- `index.css`
  - classes `discord-overlay-*` revues pour être purement décoratives (position absolue, sans impact largeur/hauteur de texte)

Vérification (obligatoire)
1) Cas 1 ligne:
- texte normal
- `# titre`, `##`, `###`, `-#`
- `> quote`, `- item`, `1. item`, bloc code
=> caret doit rester collé au texte affiché.

2) Cas multi-lignes mixtes:
- alternance markdown/non-markdown
- suppression/reédition de préfixes markdown
=> aucun “saut” à l’activation/désactivation overlay.

3) Cas long (scroll):
- dépasser `max-h`
- scroller en milieu de texte
=> overlay et caret restent alignés pendant le scroll.

4) Cross-browser:
- Firefox (prioritaire)
- Chromium
=> rendu identique à ±1px max.

Risques et mitigation
- Risque: perte d’effet “titre gras” dans l’input live.
- Mitigation: conserver l’emphase via couleur + séparateur visuel, et garder le rendu riche complet dans le message envoyé (`markdown.tsx`) où l’alignement caret n’est pas un enjeu.

Résultat attendu
- Plus de décalage persistant dans l’input.
- Overlay robuste en Firefox.
- Tous les markdowns demandés restent supportés dans l’overlay, sans casser l’édition.
