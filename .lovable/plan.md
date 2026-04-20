
## Objectif

Corriger définitivement le décalage visible du composer Markdown dans `MessageInput.tsx`. Le problème restant ne vient pas seulement de la toolbar : il y a encore un désalignement structurel entre le textarea, l’overlay Markdown, et l’auto-resize du composer.

## Causes restantes identifiées

1. `InputMarkdownOverlay` est **absolu en `inset-0`**, mais dans `MessageInput` il reçoit une classe personnalisée (`py-0 min-h-[28px]`) qui **écrase son padding par défaut**.
   - Résultat : l’overlay démarre au bord du wrapper alors que le textarea vit à l’intérieur d’un conteneur paddé (`px-4 pt-3 pb-1`).
   - Le rendu Markdown n’est donc pas ancré exactement au même point que la vraie saisie.

2. `adjustTextareaHeight()` garde encore un baseline desktop de **44px** hérité de l’ancien layout.
   - Après insertion Markdown, le textarea repasse à `auto`, recalcule `scrollHeight`, puis remonte à 44px.
   - Ce recalcul crée un saut vertical perceptible sur le premier clic.

3. Le conteneur principal du composer utilise encore `transition-all`.
   - Toute micro-variation de hauteur/largeur est animée, ce qui **amplifie visuellement** le moindre recalcul.

4. La toolbar Markdown est mieux contrainte qu’avant, mais son wrapper central reste animé avec `translate/opacity` dans un layout qui dépend encore d’un parent animé.
   - Le vrai “décalage” perçu est surtout la combinaison overlay mal calé + textarea qui re-mesure.

## Correctif définitif

### A — Recaler parfaitement l’overlay sur le textarea

Dans `src/components/chat/MessageInput.tsx` :

- Ne plus passer une classe qui neutralise le padding utile de l’overlay.
- Faire correspondre **exactement** les métriques et offsets entre :
  - wrapper du textarea
  - `InputMarkdownOverlay`
  - `textarea`

Approche :
- conserver le wrapper paddé actuel
- faire porter à l’overlay **les mêmes paddings internes réels** que la zone de texte visible
- ne pas laisser `InputMarkdownOverlay` s’étirer sur une zone différente du textarea

Concrètement :
- remplacer la prop `className={compact ? 'py-0 min-h-[28px]' : 'py-0 min-h-[28px]'}` par une classe alignée sur le composer réel
- même `px`
- même `pt/pb`
- même `min-height`
- même `text-sm`, `line-height`, `fontFamily`, `fontWeight`

Effet attendu :
- le Markdown rendu ne “bouge” plus par rapport au caret
- plus de faux décalage visuel lors d’un clic sur une icône

### B — Corriger l’auto-resize pour le nouveau composer

Dans `MessageInput.tsx` :

- recalculer les constantes de hauteur minimale selon le nouveau layout vertical
- supprimer la logique baseline 44px trop agressive si elle ne correspond plus au bloc textarea actuel
- utiliser une hauteur minimale réellement basée sur :
  - textarea seul
  - et non l’ancienne ligne de composer horizontale

Approche recommandée :
- garder `textarea.style.height = 'auto'`
- puis appliquer `Math.max(scrollHeight, minTextareaHeight)`
- avec une valeur de min-height cohérente avec le `py-0 text-sm min-h-[28px]`

Effet attendu :
- plus de saut vertical au premier clic Markdown
- la hauteur du textarea n’est plus réimposée artificiellement à une valeur issue de l’ancien layout

### C — Retirer l’animation globale qui amplifie le bug

Dans `MessageInput.tsx` :

- remplacer `transition-all` sur le conteneur principal du composer par une transition ciblée
- ex. seulement `transition-colors`, `transition-shadow`, ou aucune transition structurelle

À ne plus animer :
- hauteur
- largeur
- padding
- border layout

Effet attendu :
- les micro-ajustements restants ne seront plus visuellement exagérés
- la barre semblera stable même pendant insertion Markdown

### D — Stabiliser définitivement la barre d’actions

Le bouton Send permanent est une bonne base, mais il faut finaliser la stabilisation :

- garder la structure en 3 zones
- conserver le groupe droit à largeur réservée
- garder `shrink-0` sur gauche et droite
- garder le centre en `min-w-0 overflow-hidden`
- éviter toute classe qui pourrait réintroduire une expansion implicite du parent

Pour la toolbar Markdown :
- conserver `onMouseDown={(e) => e.preventDefault()}` sur tous les boutons
- garder le scroll horizontal interne si nécessaire
- limiter les transitions à l’opacité/translation de la toolbar elle-même, pas du composer global

### E — Si nécessaire, fiabiliser `InputMarkdownOverlay.tsx`

Dans `src/components/chat/InputMarkdownOverlay.tsx` :

- rendre la notion de padding plus explicite pour éviter que `className` remplace accidentellement l’alignement attendu
- soit en séparant :
  - structure absolue
  - métriques texte
  - spacing interne
- soit en documentant/classant les variantes prévues pour `MessageInput`

Le parsing Markdown ne change pas.

## Fichiers concernés

### 1. `src/components/chat/MessageInput.tsx`
Modifications prévues :
- recalage overlay/textarea
- correction auto-resize
- suppression de `transition-all`
- maintien du Send permanent
- maintien du layout 3 zones
- nettoyage des classes responsables de reflow visible

### 2. `src/components/chat/InputMarkdownOverlay.tsx`
Modifications possibles :
- sécuriser la gestion des paddings/offsets
- éviter qu’une `className` incomplète désaligne l’overlay
- aucun changement du moteur Markdown

## Résultat attendu

Après correction :
- cliquer sur une icône Markdown ne provoque plus aucun saut visible
- le texte rendu par l’overlay reste exactement superposé au textarea
- la barre d’actions reste immobile
- le bouton Send ne modifie plus le layout
- pas de régression mobile
- pas de changement sur mentions, attachments, polls, follow bar, ni `src/lib/markdown.tsx`

## Détails techniques

La cause la plus probable du bug résiduel est maintenant :
1. **overlay mal ancré par rapport au textarea**
2. **auto-resize encore calé sur l’ancien baseline**
3. **animation globale du composer qui rend le moindre recalcul visible**

La correction définitive consiste donc à :
- réaligner les métriques
- supprimer les transitions structurelles
- recalculer la hauteur sur la vraie géométrie du nouveau composer
