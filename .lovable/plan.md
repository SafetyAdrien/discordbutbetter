

# Optimisation du rendu RepliedLine pour les messages groupés

## Analyse

Dans `ChatArea.tsx`, `hasReply` force toujours `showAuthor=true` quand un message a une réponse (ligne 1475, 1481). Donc le bloc `showAuthor=false` (lignes 1700-1796) qui contient un `RepliedLine` est **du code mort** — jamais atteint. Le seul rendu actif est celui des lignes 1530-1699.

Deux problèmes visuels actuels :

1. **Espacement vertical insuffisant** au-dessus de la ligne de réponse quand elle suit un message du même auteur (cas typique : on répond à quelqu'un, puis on répond à un autre message juste après). Le `pt-1.5` du wrapper externe colle la mini-ligne au message précédent et casse la lecture du connecteur en L.
2. **Le `mb-0.5` sur `RepliedLine`** crée un double gap avec le `mt-0.5` de l'avatar suivant, et l'alignement pixel-perfect du connecteur sur la gouttière de l'avatar n'est pas garanti.

## Correctifs

### A. `src/components/chat/ChatArea.tsx`
- **Branche `showAuthor=true` (autour ligne 1530)** :
  - Augmenter le padding-top du wrapper externe à `pt-2` quand `hasReply` est vrai (préserver `pt-1.5` sinon), pour aérer la ligne de réponse au-dessus du message précédent.
  - Sur le `<RepliedLine>` : remplacer `className="mb-0.5"` par `className="mb-1"` pour un demi-interligne d'air avant le bloc avatar+contenu (alignement Discord).
  - Conserver `indent={56}` (40px avatar + gap 12 + 4 d'offset) — c'est correct.

- **Branche `showAuthor=false` (lignes 1700-1796)** : 
  - **Supprimer entièrement** le bloc `(message.repliedMessage || parsedReply) && <RepliedLine ... />` qui est du code mort (puisque `hasReply` force `showAuthor=true`).
  - Cela clarifie le code et évite la divergence si `hasReply` était modifié plus tard.

### B. `src/components/chat/RepliedLine.tsx`
- **Tracé du connecteur L** : ajuster pour que la base du L (point bas-gauche) tombe précisément dans la zone verticale de l'avatar suivant. Avec un `mb-1` (4px) au-dessus de l'avatar 40x40 mt-0.5 (2px), recaler le SVG :
  - `top: 12` → `top: 14` pour aligner la pointe basse du L sur le sommet de l'avatar parent.
  - `height: 24` inchangé.
- Réduire la hauteur visuelle du conteneur de 1px (`min-h-[18px]` au lieu de `20px`) pour densifier la mini-ligne — fidèle Discord.

### C. ThreadView, AnnouncementComments, MediaComments, DMConversation
- **Pas de changement structurel** : les conteneurs de ces surfaces n'ont pas de groupage avatar-based équivalent à ChatArea. La marge `mb-1` héritée via `className` dans RepliedLine sera homogène.

## Résultat attendu

- Quand deux messages d'affilée répondent à des cibles différentes, chaque ligne de réponse est clairement détachée du message précédent (4-6px d'air en plus).
- Le connecteur L pointe pile dans la gouttière de l'avatar (alignement pixel-perfect).
- La mini-ligne de réponse reste cohérente sur toutes les surfaces (ChatArea, Threads, comments, DM).
- Code mort supprimé dans la branche `showAuthor=false`.

## Détails techniques

- Aucun changement DB, aucun fichier auto-géré touché.
- Le calcul `hasReply` reste tel quel (force `showAuthor=true` — comportement Discord-exact).
- Aucune régression sur DM (déjà conforme), Mobile bubble (déjà au-dessus de la bulle).

