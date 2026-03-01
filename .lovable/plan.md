

# Swipe horizontal entre les onglets de la navigation mobile

## Objectif

Permettre a l'utilisateur de glisser horizontalement (swipe gauche/droite) pour naviguer entre les 4 onglets de la barre de navigation mobile (Messages, Serveurs, Notifs, Vous), en plus du swipe-back depuis le bord gauche deja en place pour les vues superposees (channels, chat, thread).

## Approche

### 1. Creer un hook `useSwipeTabs`

**Nouveau fichier** : `src/hooks/useSwipeTabs.ts`

Ce hook gere le swipe horizontal sur la zone principale des onglets :
- Detecte un swipe horizontal (dx > dy * 1.5, seuil minimum de 50px)
- Ne se declenche PAS depuis le bord gauche (< 30px) pour ne pas conflictuellement avec `useSwipeBack`
- Swipe vers la gauche = onglet suivant, swipe vers la droite = onglet precedent
- Retourne `onTouchStart`, `onTouchMove`, `onTouchEnd` et un `offsetX` pour animer le glissement en temps reel
- Accepte l'index courant de l'onglet et le nombre total d'onglets

### 2. Integrer dans `MobileLayout.tsx`

- Importer `useSwipeTabs`
- Definir l'ordre des onglets : `['home', 'servers', 'notifications', 'profile']`
- Attacher les handlers touch sur le conteneur `<div>` des vues d'onglets (ligne 421)
- Au declenchement du swipe, appeler `setActiveTab` avec l'onglet precedent/suivant
- Ajouter une translation CSS en temps reel (`transform: translateX(offsetX)`) sur le conteneur pour un retour visuel fluide pendant le geste
- Ne PAS activer le swipe-tabs quand une vue superposee est active (`mobileView.type !== 'tab'`)

### 3. Animation de transition entre onglets

- Envelopper le contenu des onglets dans un conteneur anime avec `framer-motion`
- Utiliser `AnimatePresence` avec une direction (gauche/droite) basee sur l'index de l'onglet precedent vs le nouveau
- Transition rapide de type spring pour un rendu fluide

---

## Resume des fichiers

| Fichier | Changement |
|---|---|
| `src/hooks/useSwipeTabs.ts` | Nouveau hook pour le swipe horizontal entre onglets |
| `src/components/mobile/MobileLayout.tsx` | Integrer le swipe-tabs sur la zone des onglets avec animation directionnelle |

