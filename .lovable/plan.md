
## Analyse approfondie (constats vérifiés)

J’ai revu le code actuel de `RoleManager` + les traces runtime (replay/console/network) et il y a plusieurs signaux cohérents :

1. **Le drag démarre puis se termine en `cancel`** (pas en `end`)  
   - Dans le replay, l’item est bien “picked up” puis “Dragging was cancelled”.
   - Côté réseau, on ne voit **aucune requête de réordonnancement** des rôles pendant cette séquence, donc `handleDragEnd` n’aboutit pas au reorder.

2. **Warning React pendant le DnD**  
   - `Function components cannot be given refs` dans `RoleManager`, pointant `RoleIcon`.
   - Ce warning vient de la mécanique d’animation DnD qui manipule des refs pendant le cycle drag/drop. Même si ce n’est pas toujours bloquant, c’est un signal de structure instable pendant le drag.

3. **Surface mobile sensible aux conflits de geste**  
   - Le handle de drag est présent, mais il manque des protections tactiles clés (`touch-action: none`) sur la zone activatrice.
   - Sans ça, le navigateur peut basculer en scroll/pan et interrompre le drag (annulation précoce).

## Causes racines probables

### Cause A — Conflit tactile natif (scroll/pan) sur mobile
Le handle utilise `PointerSensor`, mais la zone de drag n’impose pas `touch-action: none`. Sur mobile, cela provoque souvent des `pointercancel` implicites (drag interrompu).

### Cause B — Gestion des refs incomplète autour du rendu drag
Le warning `ref` sur `RoleIcon` indique un chemin où un composant fonctionnel reçoit un ref pendant l’animation DnD. Cela peut dégrader la stabilité visuelle/événementielle du drag.

### Cause C — Item “non draggables” visuellement bloqués mais pas réellement désactivés
`canDragAbove` ne désactive pas `useSortable` lui-même. On évite une partie côté logique, mais le capteur peut quand même entrer en flux drag avant abort, ce qui ajoute du bruit comportemental.

---

## Plan de correction (implémentation)

### 1) Stabiliser l’activation tactile du drag (mobile first)
**Fichier : `src/components/server-settings/RoleManager.tsx`**

- Ajouter `touch-none` sur la **poignée de drag** (et `select-none` pour éviter sélection texte parasite).
- Conserver la cible tactile 44px (déjà présente), mais la rendre explicitement activatrice du drag uniquement.
- Utiliser `setActivatorNodeRef` de `useSortable` sur la poignée pour aligner le pattern handle + capteurs.

Effet attendu : disparition des annulations précoces liées aux gestes natifs.

---

### 2) Capteurs DnD robustes selon contexte tactile
**Fichier : `src/components/server-settings/RoleManager.tsx`** (ou extraction légère vers hook existant)

- Mettre en place une stratégie capteur cohérente avec mobile :
  - support tactile avec **activation intentionnelle** (press-and-move),
  - desktop fluide au pointer.
- Éviter les combinaisons ambiguës qui peuvent provoquer compétition de capteurs dans ce composant spécifique.

Effet attendu : drag plus fiable sur mobile, moins de “départs fantômes”/annulations.

---

### 3) Supprimer le warning `ref` dans le DragOverlay
**Fichier : `src/components/server-settings/RoleManager.tsx`**

- Rendre `RoleIcon` compatible ref (`forwardRef`) **ou** ne plus utiliser `RoleIcon` tel quel dans l’overlay (rendu DOM inline pour l’overlay).
- Garder un overlay simple et mesurable par DnD sans composant fonctionnel ambigu pour les refs.

Effet attendu : plus de warning React pendant drag, comportement d’animation plus propre.

---

### 4) Désactivation réelle des rôles non déplaçables
**Fichier : `src/components/server-settings/RoleManager.tsx`**

- Passer `disabled` à `useSortable` quand le rôle n’est pas déplaçable.
- Ne pas attacher `listeners/attributes` quand désactivé.
- Garder l’indicateur visuel (opacité/cursor) mais avec blocage fonctionnel réel.

Effet attendu : moins de conflits UX (pas de tentative de drag sur des rôles interdits).

---

### 5) Renforcer l’anti-clic post-drag
**Fichier : `src/components/server-settings/RoleManager.tsx`**

- Conserver `wasDraggingRef`, mais ajuster la fenêtre de neutralisation click (surtout après `cancel`) pour éviter les sélections involontaires.
- Limiter la propagation des événements depuis la poignée vers la sélection de ligne pendant le drag.

Effet attendu : séparation nette entre “sélectionner un rôle” et “déplacer un rôle”.

---

## Validation prévue (obligatoire)

1. **Desktop**
   - Drag vers le haut/bas fonctionne sur plusieurs rôles.
   - Le réordonnancement persiste après refresh.
   - Aucune régression de sélection/édition de rôle.

2. **Mobile**
   - Drag depuis la poignée sans annulation immédiate.
   - Pas de conflit majeur avec scroll de la page.
   - Pas de sélection accidentelle après tentative de drag.

3. **Runtime**
   - Plus de warning `Function components cannot be given refs` lié à `RoleManager`.
   - Requêtes de mise à jour des positions bien émises lors d’un drop valide.

## Portée des fichiers

- Modifications ciblées principalement dans :
  - `src/components/server-settings/RoleManager.tsx`
- Pas de changement backend requis pour ce correctif.

## Risques / mitigation

- **Risque** : sensation différente entre desktop et mobile.
- **Mitigation** : calibrage fin des contraintes d’activation et test croisé (mobile + desktop) avant stabilisation finale.
