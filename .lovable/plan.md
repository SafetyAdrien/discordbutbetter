

# Correctif définitif — RepliedLine doit être HORS du bloc message (au-dessus de l'avatar)

## Le vrai problème (que je voyais mal)

Sur la capture Discord (image 2), la ligne de réponse `↰ avatar @Adrien_Sama HYTL Message de réponse.` est **AU-DESSUS de l'avatar du message principal**, et le connecteur en L **descend depuis cette ligne vers la gouttière de l'avatar**. La structure visuelle est :

```
↰ [mini-av] @Adrien_Sama [HYTL] Message de réponse.    ← ligne RepliedLine
┌─                                                       ← connecteur L visible
│  ⬢ Adrien_Sama 08:54                                  ← message principal
│     Message répondue.
```

Sur ma capture actuelle (image 1), `RepliedLine` est rendu **À L'INTÉRIEUR du `<div className="flex-1 min-w-0">` à droite de l'avatar**, donc il apparaît **sous le nom de l'auteur** et **à droite de l'avatar** — c'est topologiquement faux.

## Cause racine

Dans `ChatArea.tsx` (lignes 1633-1653 pour `showAuthor=true`, lignes 1776-1796 pour `showAuthor=false`), `<RepliedLine>` est positionné dans la colonne de droite du flex, donc il hérite du décalage de l'avatar. Idem pour `ThreadView.tsx` (lignes 925-935) et les comments.

## Correctif structurel

### A. `src/components/chat/ChatArea.tsx` — Sortir RepliedLine du flex
Pour les **deux blocs** (showAuthor true ligne 1530, et regroupé ligne 1701) :
- **Déplacer le rendu de `<RepliedLine>` AVANT le `<div className="flex gap-3 items-start">`**, donc en frère aîné de la ligne avatar+contenu.
- Donner à `<RepliedLine>` un `indent={56}` (40px avatar + 12px gap + ~4px) pour aligner le **mini-avatar de la ligne de réponse** avec le **début du contenu** (pas avec l'avatar principal).
- Le connecteur L (positionné à `left: indent - 30 = 26px`) descend alors **dans la gouttière de l'avatar principal**, exactement comme Discord.

### B. `src/components/chat/RepliedLine.tsx` — Réajuster le tracé du connecteur
Le tracé SVG actuel `M 4 18 L 4 8 Q 4 4 8 4 L 28 4` part du bas et monte vers la droite. C'est incorrect quand RepliedLine est **au-dessus** : le L doit partir du haut-gauche (de la ligne RepliedLine) et **descendre puis tourner à droite** vers l'avatar du message principal en dessous.

Nouveau tracé : **inverser verticalement** — le SVG est positionné avec `top` négatif (ou plutôt avec un `top` qui chevauche le bas de la ligne RepliedLine et le haut de l'avatar principal). Concrètement :
- SVG positionné avec `top: 10px` (centre-bas de la mini-ligne) sur 18px de haut, mais **le tracé descend** : `M 4 0 L 4 14 Q 4 18 8 18 L 28 18` — part du haut-gauche, descend verticalement, tourne à 90° vers la droite en bas. Cela visuellement rejoint le haut de l'avatar principal qui se trouve juste en dessous.

Cependant, comme RepliedLine est désormais **au-dessus** du message, le connecteur n'a même pas besoin de pointer vers l'avatar principal en dessous — sur Discord, le L pointe **depuis le mini-avatar de la ligne de réponse vers la gauche/bas**, créant une "antenne" visuelle qui s'enracine dans la gouttière. Donc :
- Tracé final : `M 4 18 L 4 6 Q 4 2 8 2 L 24 2` (part du **bas-gauche** dans la gouttière de l'avatar principal en dessous, monte, tourne à droite vers le mini-avatar de la ligne RepliedLine).
- Position SVG : `top: 50%` calé sur la mini-ligne, `left: indent - 30` (donc à 26px du bord, soit pile dans la zone de l'avatar principal de 40px).

### C. `src/components/threads/ThreadView.tsx`
Même refactoring : extraire `RepliedLine` du `<div className="flex-1 min-w-0">` et le placer **avant** le `<div className="flex">` qui contient l'avatar + contenu. `indent` ajusté selon l'avatar du thread (32px → indent=44).

### D. `src/components/channels/announcement/AnnouncementComments.tsx` & `MediaComments.tsx`
Idem : sortir `RepliedLine` du wrapper du commentaire pour qu'il soit **au-dessus** de la ligne avatar+contenu, avec un `indent` aligné sur l'avatar du commentaire.

### E. DM (`DMConversation.tsx`) & `MobileMessageBubble.tsx`
- **DMConversation** : non-bubble layout, même structure que ChatArea → sortir RepliedLine du flex, indent=56.
- **MobileMessageBubble** : layout bubble (flex avec avatar à gauche pour incoming). RepliedLine est déjà rendu **au-dessus** de la bulle dans la colonne de droite, ce qui est conforme. Garder tel quel.

## Résultat attendu (strictement la capture Discord)

- La ligne `↰ [mini-av] @Adrien_Sama [HYTL] Message de réponse.` est positionnée **AU-DESSUS** du bloc avatar+nom+contenu du message principal.
- Le connecteur en L visible part de la **gouttière de l'avatar principal** (en bas), monte, tourne à droite vers le mini-avatar de la ligne de réponse.
- Pseudo coloré + badge `RoleBadgePopover` interactif inchangés (déjà conformes).
- Comportement identique sur ChatArea (showAuthor=true ET regroupé), ThreadView, AnnouncementComments, MediaComments, DMConversation. Mobile DM bubble inchangé (déjà au bon endroit).

## Détails techniques

- Aucune modification de `parseRepliedMessage` (déjà conforme).
- Aucun changement de DB ni de fichiers auto-gérés.
- Le wrapper extérieur de chaque message conserve `relative` pour permettre au survol/SwipeToReply de fonctionner sur tout l'ensemble (RepliedLine + corps).
- `indent` devient une prop critique : 56 pour ChatArea (avatar 40 + gap 12 + petit offset), 44 pour ThreadView/comments (avatar 32 + gap 8 + offset), 0 pour mobile (déjà géré).
- Tracé SVG inversé pour pointer **vers le haut-droite** (depuis la gouttière de l'avatar du message en dessous, vers la mini-ligne au-dessus).

