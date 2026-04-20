

## Objectif

Déplacer la bordure gauche jaune des messages mentionnés pour qu'elle touche **le bord gauche du conteneur de chat** (pleine largeur), au lieu de s'afficher à 16 px du bord à cause du padding `px-4` du message.

## Problème actuel

Les conteneurs de message rendus dans `ChatArea.tsx`, `ThreadView.tsx`, etc. utilisent `px-4` (16 px de padding horizontal). Le `box-shadow: inset 2px 0 0 0 #faa61a` de `.message-mentioned` est donc dessiné **à l'intérieur** de ce padding, à 16 px du bord visible de la zone de chat.

L'image attendue montre la barre jaune **collée au bord gauche** de la zone de chat (comme Discord).

## Solution

Étendre visuellement la bordure jusqu'au bord du conteneur via marges négatives + padding compensatoire, sans toucher à la mise en page interne.

### Modification CSS — `src/index.css`

Remplacer `.message-mentioned` et `.message-mentioned:hover` par une version qui :
- annule le `px-4` parent via `margin-inline: -1rem` 
- recompose le padding via `padding-inline: 1rem`
- garde le `box-shadow` inset à gauche (touche désormais réellement le bord)

```css
.message-mentioned {
  background: rgba(250, 166, 26, 0.10);
  box-shadow: inset 2px 0 0 0 #faa61a;
}

.message-mentioned:hover {
  background: rgba(250, 166, 26, 0.15);
  box-shadow: inset 2px 0 0 0 #faa61a;
}
```

(Inchangé.) Le vrai correctif est sur les conteneurs : retirer `px-4` quand `isMentioningMe`, ou étendre le fond via `mx`/`px` négatifs.

### Modification composants

Dans **`ChatArea.tsx`**, **`ThreadView.tsx`**, **`AnnouncementChannel.tsx`**, **`DMConversation.tsx`** : pour chaque conteneur de message qui combine `message-hover` + `px-4` (ou `px-2` dans certains layouts compacts), ajouter quand `isMentioningMe` est vrai un wrapper visuel en pleine largeur.

Approche retenue (minimale, sans changer la structure) : ajouter à la classe conditionnelle un offset négatif compensé.

```tsx
className={cn(
  "group/message group message-hover px-4 pb-1 mb-1 relative",
  showAuthor ? "pt-1.5" : "py-0.5",
  isMentioningMe && "message-mentioned -mx-4 px-8",
)}
```

Explication :
- `-mx-4` : étend le conteneur de 16 px à gauche et à droite → atteint le bord de la zone de chat
- `px-8` : remplace `px-4` par 32 px (16 px d'origine + 16 px pour compenser la marge négative) → le contenu (avatar, texte) reste à la même position visuelle
- Le `box-shadow inset 2px` se dessine maintenant exactement au bord gauche visible

Pour les variantes utilisant `px-2 -mx-2` (ligne ~1115 de `ChatArea.tsx`), appliquer `-mx-4 px-6` (déjà décalé de 2, on étend de 2 supplémentaires et on compense).

### Récapitulatif par emplacement

| Fichier | Padding actuel | Classes ajoutées si mentionné |
|---|---|---|
| `ChatArea.tsx` ligne ~1115 | `px-2 -mx-2` | `message-mentioned -mx-4 px-6` (au lieu de `-mx-2 px-2`) |
| `ChatArea.tsx` ligne ~1256 | `px-4` | `message-mentioned -mx-4 px-8` |
| `ChatArea.tsx` ligne ~1433 | `px-4` | `message-mentioned -mx-4 px-8` |
| `ThreadView.tsx` ~777 | `px-4` | `message-mentioned -mx-4 px-8` |
| `AnnouncementChannel.tsx` ~759 | `px-4` | `message-mentioned -mx-4 px-8` |
| `DMConversation.tsx` ~436 | `px-4` | `message-mentioned -mx-4 px-8` |

Les valeurs exactes seront vérifiées à l'implémentation pour respecter le padding réel de chaque variante (group header vs sub-message).

## Détails techniques

- **Aucune modification du moteur Markdown ni du wire format**
- **Aucune migration SQL**
- **Aucun changement** sur les messages non-mentionnés (le hover normal continue avec son padding standard)
- Le `box-shadow inset` au bord gauche reste **net** (1 px = 1 px réel) ; pas d'utilisation de `border-left` qui décalerait le texte
- Compatible avec les angles droits récemment imposés sur `.message-hover`

## Garantie de non-régression

- Position du contenu (avatar + texte) **identique** : la marge négative est compensée par le padding équivalent
- Pas d'impact sur les attachments, polls, reactions, embeds (rendus à l'intérieur du même conteneur)
- Pas d'impact mobile (les conteneurs mobiles n'utilisent pas `message-mentioned` actuellement, à vérifier dans `MobileChatView.tsx` si extension nécessaire)
- Hover non-mentionné inchangé

## Fichiers modifiés

- `src/components/chat/ChatArea.tsx` — 3 occurrences
- `src/components/threads/ThreadView.tsx` — 1 occurrence
- `src/components/channels/AnnouncementChannel.tsx` — 1 occurrence
- `src/components/dm/DMConversation.tsx` — 1 occurrence

