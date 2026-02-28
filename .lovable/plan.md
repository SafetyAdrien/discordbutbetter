
Objectif
Corriger définitivement le centrage vertical du texte et du placeholder dans le chat input Desktop (vue serveur), y compris quand le contenu bascule vers l’overlay Markdown.

Diagnostic confirmé dans le code actuel
1) Le textarea Desktop est piloté par `scrollHeight` avec une tolérance trop faible :
- `src/components/chat/MessageInput.tsx` (fonction `adjustTextareaHeight`)
- logique actuelle : `(!compact && sh <= minH + 2) ? minH : Math.max(sh, minH)`
- sur certains navigateurs Desktop, un champ 1 ligne peut remonter `scrollHeight` à 43–45px, donc la hauteur n’est plus verrouillée à 40px → espace résiduel en bas de la line box → rendu visuel “texte un peu trop haut”.

2) Le correctif optique actuel (11px / 9px) est insuffisant :
- textarea non compact: `pt-[11px] pb-[9px] min-h-[40px]`
- overlay non compact: mêmes paddings
- ce décalage de +1px vers le bas n’est pas assez fort selon le rendu actuel.

3) Le rail d’actions droit n’a pas encore des tailles Desktop homogènes :
- `+` déjà forcé en 40x40
- emoji/sticker/send restent en padding variable (non bloqués à 40x40)
- ça peut accentuer l’impression de désalignement visuel du textarea dans la barre.

Approche de correction (Desktop ciblé, sans impacter mobile)
1) Verrouillage plus robuste de la hauteur 1 ligne Desktop
Fichier: `src/components/chat/MessageInput.tsx`
- Introduire des constantes explicites :
  - `DESKTOP_MIN_HEIGHT = 40`
  - `COMPACT_MIN_HEIGHT = 28`
  - `DESKTOP_SINGLE_LINE_TOLERANCE = 6` (au lieu de 2)
- Adapter `adjustTextareaHeight` :
  - `height = auto`
  - si `!compact` et `scrollHeight <= DESKTOP_MIN_HEIGHT + DESKTOP_SINGLE_LINE_TOLERANCE`, forcer `40px`
  - sinon `Math.max(scrollHeight, minHeight)`
- Résultat attendu : un champ 1 ligne Desktop ne “gonfle” plus à 43–45px.

2) Correction optique plus franche (descendre légèrement la ligne)
Fichiers:
- `src/components/chat/MessageInput.tsx`
- `src/components/chat/InputMarkdownOverlay.tsx`
- Passer le padding Desktop non compact de `pt-[11px] pb-[9px]` à `pt-[12px] pb-[8px]` (même somme 20, mais ligne abaissée de +1px supplémentaire).
- Conserver compact inchangé (`py-1`, `min-h-[28px]`).

3) Synchronisation stricte textarea/overlay
Fichiers:
- `src/components/chat/MessageInput.tsx`
- `src/components/chat/InputMarkdownOverlay.tsx`
- Garder strictement identiques entre textarea et overlay :
  - `font-size` (0.875rem)
  - `line-height` (1.25rem)
  - `font-family` (`"gg sans", "Noto Sans", "Helvetica", sans-serif`)
  - paddings et min-height Desktop/compact
- Résultat attendu : aucun saut visuel quand l’overlay Markdown apparaît.

4) Uniformiser les boutons Desktop autour du textarea
Fichier: `src/components/chat/MessageInput.tsx`
- En non-compact Desktop, passer emoji/sticker/send sur un gabarit fixe cohérent avec la ligne de 40px (`h-10 w-10 p-0 min-h-0 flex items-center justify-center`).
- Garder le mode compact tel quel.
- Résultat attendu : la barre n’a plus d’éléments de tailles perçues différentes qui “cassent” l’alignement visuel.

Fichiers à modifier
1. `src/components/chat/MessageInput.tsx`
- Renforcer l’algorithme de hauteur (tolérance Desktop + verrou 40px)
- Mettre padding Desktop textarea en `pt-[12px] pb-[8px]`
- Uniformiser les boutons de droite en non-compact

2. `src/components/chat/InputMarkdownOverlay.tsx`
- Mettre padding Desktop overlay en `pt-[12px] pb-[8px]`
- Conserver la parité métrique avec le textarea

Validation obligatoire après implémentation
1) Desktop (prioritaire)
- Placeholder vide: visuellement centré
- Texte 1 ligne: centré (plus d’effet “trop en haut”)
- Texte multi-lignes: croissance naturelle sans saut
- Markdown actif: overlay parfaitement superposé au texte/caret

2) Régression rapide
- Mode compact inchangé
- Mobile inchangé
- Boutons (+, emoji, sticker, envoi) toujours fonctionnels

Pourquoi ce plan est le bon pour ton cas
- Il traite la cause mécanique (hauteur 1 ligne non verrouillée sur certains navigateurs) et la cause optique (ligne encore un peu haute malgré 11/9).
- Il garde une synchronisation stricte overlay/textarea.
- Il reste ciblé UI-only, sans toucher au backend ni à la logique d’envoi.
