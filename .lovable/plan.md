
## Objectif

Corriger définitivement le décalage de la zone de saisie dans `MessageInput.tsx` quand on clique sur un bouton Markdown, sans régression sur la barre d’actions, le textarea, l’overlay Markdown ni le comportement mobile.

## Problème exact

Le saut visible ne vient pas d’une seule cause :

1. Le bouton **Send** est monté/démonté conditionnellement :
   - état vide → pas de bouton
   - après clic Markdown (`# `, `**`, etc.) → le champ devient non vide, donc le bouton apparaît
   - résultat : le bloc droit change de largeur et toute la ligne se recalcule

2. La zone Markdown centrale utilise une largeur animée (`max-w-[640px]`) dans un layout flex :
   - à l’ouverture/fermeture ou après insertion, le navigateur recalcule la répartition de largeur
   - le bloc droit peut être repoussé ou recompacté

3. Le clic sur les boutons Markdown doit continuer à préserver le focus du textarea, sinon cela ajoute un micro-saut de reflow/scroll.

## Fix définitif

### A — Stabiliser la largeur du bloc droit

Dans `src/components/chat/MessageInput.tsx` :

- **Toujours rendre** le bouton Send dans le DOM
- Ne plus utiliser :
  - `(value.trim() || attachments.length > 0 || isMobile) && (...)`
- Le remplacer par un bouton permanent avec 3 états :
  - **actif** si message/pièces jointes/mobile
  - **désactivé visuellement** si vide
  - **disabled** si envoi impossible

Effet :
- la largeur du bloc droit ne change plus jamais
- cliquer sur un bouton Markdown n’ajoute plus brutalement un nouvel élément à droite

### B — Réserver une largeur fixe au groupe droit

Toujours dans `MessageInput.tsx` :

- Encapsuler `Sticker + Emoji + Send` dans un conteneur à largeur stable
- Exemple de logique :
  - desktop avec stickers : largeur prévue pour 3 actions
  - mobile : largeur prévue pour 2 actions
- Le groupe droit garde `shrink-0`
- Le bouton Send garde sa place même quand il est inactif

Effet :
- plus aucun déplacement horizontal des actions de droite

### C — Rendre la zone Markdown non-intrusive pour le layout

Refactor de la barre d’actions en 3 zones réellement stables :

```text
[gauche fixe] [centre flexible mais contraint] [droite fixe]
   + / chevron      toolbar markdown scrollable     sticker emoji send
```

Changements :
- zone gauche : `shrink-0`
- zone centre : `min-w-0 flex-1 overflow-hidden`
- wrapper interne Markdown :
  - `overflow-x-auto`
  - pas de comportement qui pousse les siblings
  - garder le scroll horizontal si besoin
- zone droite : `shrink-0`

En plus :
- remplacer l’animation la plus agressive basée uniquement sur `max-width` par une ouverture plus stable :
  - soit `w-0 -> w-auto` via wrapper externe + contenu interne
  - soit `max-width` mais dans un conteneur dont les blocs voisins ont déjà leurs largeurs réservées

### D — Préserver définitivement le focus

Conserver et homogénéiser sur **tous** les boutons Markdown :

- `onMouseDown={(e) => e.preventDefault()}`

Effet :
- le textarea ne perd pas le focus
- pas de scroll-into-view parasite
- pas de re-mesure liée à une perte/reprise de focus

### E — Vérifier les métriques overlay / textarea

Le décalage principal vient du layout, mais je sécurise aussi l’alignement visuel :

- vérifier que le textarea et `InputMarkdownOverlay` gardent exactement :
  - même font family
  - même font size
  - même line-height
  - mêmes paddings horizontaux/verticaux dans cette version du composer
- ne pas modifier le moteur Markdown, seulement l’alignement du composer si nécessaire

## Fichiers concernés

### 1. `src/components/chat/MessageInput.tsx`
Modifications prévues :
- rendre le bouton Send permanent
- réserver la largeur du bloc droit
- stabiliser la structure en 3 zones
- conserver la toolbar Markdown complète
- garder `onMouseDown preventDefault` partout
- ajuster les classes flex/overflow pour éviter tout reflow visible

### 2. `src/components/chat/InputMarkdownOverlay.tsx`
Seulement si nécessaire :
- harmonisation fine des paddings/classe passés par `MessageInput`
- aucun changement du parsing Markdown

## Résultat attendu

Après correction :
- cliquer sur n’importe quelle icône Markdown ne déplace plus la barre
- le bouton Send ne “pop” plus à l’apparition du texte
- Sticker / Emoji / Send restent parfaitement immobiles
- la toolbar Markdown reste rétractable
- aucun saut horizontal ni vertical sur desktop et mobile

## Détails techniques

- Cause racine la plus probable : **montage conditionnel du bouton Send**
- Cause secondaire : **animation de largeur de la toolbar au sein d’un flex non totalement contraint**
- Approche retenue : **stabiliser le DOM et réserver l’espace**, plutôt que continuer à compenser visuellement le saut
- Aucun changement backend, aucune migration, aucune dépendance

## Garantie de non-régression

- Pas de modification de props de `MessageInput`
- Pas de changement sur mentions, slowmode, attachments, polls, follow bar
- Pas de changement sur `src/lib/markdown.tsx`
- La toolbar Markdown garde tous les raccourcis visuels déjà ajoutés
