
Objectif
Stabiliser le swipe horizontal entre les pages de navigation mobile (onglets du bas) sans animation, sans faux déclenchements, et sans conflits avec les autres gestes (retour, scroll, drag, saisie).

Constats (à partir du code actuel)
1) `useSwipeTabs` déclenche un `setState` (`offsetX`) à chaque `touchmove` alors que l’animation a été retirée.
- Impact: re-renders inutiles pendant le geste, comportement moins fluide, et décision finale basée sur une valeur potentiellement “stale” en `onTouchEnd`.

2) Le swipe d’onglet est actif trop largement dès que `mobileView.type === 'tab'`.
- Impact: conflits possibles quand l’utilisateur est dans une conversation DM (`activeDMId`), dans des zones interactives (champ de recherche, drag & drop serveurs), ou avec des modales ouvertes.

3) Le hook ne gère pas assez les cas mobiles réels.
- Pas de `onTouchCancel`
- Pas de garde multi-touch (pinch/zoom)
- Filtrage de direction trop permissif pour certains scrolls diagonaux

4) `MobileLayout` utilise encore `AnimatePresence mode="popLayout"`.
- Les logs montrent toujours l’avertissement React “Function components cannot be given refs…”
- `popLayout` est connu pour provoquer ce type de warning sur certains arbres de rendu.

Plan d’implémentation

1) Durcir `useSwipeTabs` (source unique de vérité du geste)
Fichier: `src/hooks/useSwipeTabs.ts`

- Remplacer la logique basée sur `offsetX` state par des `refs` uniquement:
  - `startXRef`, `startYRef`, `lastDxRef`, `lockedRef`, `trackingRef`
- Gardes d’entrée au `touchstart`:
  - ignorer si `touches.length !== 1`
  - ignorer zone edge gauche (conserver `edgeGuard`)
  - ignorer cibles interactives (input, textarea, contenteditable, et zones marquées `data-swipe-ignore="true"`)
- Améliorer le verrouillage directionnel:
  - lock horizontal seulement si le mouvement horizontal domine clairement (ratio configurable, ex. `abs(dx) > abs(dy) * 1.25`)
- Décision de swipe en `touchend` basée sur `lastDxRef` (pas sur state React)
- Ajouter `onTouchCancel` qui reset totalement le geste
- Retourner uniquement les handlers nécessaires (pas d’offset visuel)

Résultat attendu:
- Swipe plus fiable, sans latence de rendu, sans déclenchements fantômes.

2) Encadrer strictement quand le swipe d’onglet est autorisé
Fichier: `src/components/mobile/MobileLayout.tsx`

- Introduire `canSwipeTabs` (au lieu de `!isOverlayActive` seulement):
  - `mobileView.type === 'tab'`
  - `!activeDMId`
  - `!showDiscover`
  - `!showCreate`
  - `!settingsServerId`
- Attacher les handlers uniquement si `canSwipeTabs === true`
- Ajouter `onTouchCancel` côté conteneur
- Nettoyer l’état devenu inutile depuis suppression d’animation (`swipeDirection`, `prevTabIndexRef` si non utilisé ailleurs)

Résultat attendu:
- Pas de changement d’onglet involontaire pendant DM, modale, ou autres contextes sensibles.

3) Réduire les conflits avec zones interactives (drag/scroll/saisie)
Fichiers:
- `src/components/mobile/MobileServersView.tsx`
- (optionnel selon besoin) zones spécifiques dans `MobileHomeView`

- Marquer les zones qui ne doivent pas déclencher le swipe d’onglet:
  - colonne des serveurs draggable (DnD) avec `data-swipe-ignore="true"`
  - autres blocs hautement interactifs si nécessaire
- Le hook `useSwipeTabs` utilisera ce marquage pour ignorer le geste dès `touchstart`.

Résultat attendu:
- Drag & drop serveur et interactions locales ne déclenchent plus de changement d’onglet.

4) Supprimer le warning refs (stabilité render)
Fichier: `src/components/mobile/MobileLayout.tsx`

- Remplacer `AnimatePresence mode="popLayout"` par `mode="wait"` (ou retirer `mode` si inutile)
- Conserver les animations d’overlay existantes (channels/chat/thread) inchangées fonctionnellement, tout en éliminant le warning de refs

Résultat attendu:
- Console propre, moins de comportements imprévisibles liés au cycle de rendu.

5) Validation fonctionnelle (mobile)
Parcours de test à exécuter après implémentation:
1. Swipe gauche/droite entre onglets:
   - home ⇄ servers ⇄ notifications ⇄ profile
2. Scroll vertical long dans chaque onglet:
   - aucun changement d’onglet involontaire
3. Depuis “Serveurs”:
   - drag d’un serveur: pas de switch d’onglet parasite
4. Dans DM conversation (`activeDMId`):
   - le swipe horizontal ne doit pas changer d’onglet
5. Overlays (channels/chat/thread):
   - swipe-back edge gauche continue de fonctionner
6. Console:
   - disparition du warning “Function components cannot be given refs” dans `MobileLayout`

Fichiers ciblés (résumé)
- `src/hooks/useSwipeTabs.ts` (refactor robuste du geste)
- `src/components/mobile/MobileLayout.tsx` (gating + cleanup + fix AnimatePresence mode)
- `src/components/mobile/MobileServersView.tsx` (zones `data-swipe-ignore`)
- (optionnel) `src/components/mobile/MobileHomeView.tsx` (marquage zones interactives supplémentaires si nécessaire)

Notes de périmètre
- Aucun changement backend/database requis.
- Comportement “sans animation de swipe” conservé (switch d’onglet instantané).
