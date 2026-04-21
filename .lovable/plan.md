

# Correctif fidèle du système de réponse Discord-like

## Vrais problèmes (ce que j'ai raté)

D'après la capture de référence, deux défauts visuels rendent le résultat actuel **non-conforme** :

### 1. Le connecteur en L est invisible
Dans `ChatArea`, `RepliedLine` est rendu avec `indent={0}` à l'intérieur du conteneur `<div className="flex-1 min-w-0 overflow-hidden">`. Le SVG du connecteur est positionné à `left: indent - 30 = -30px` — donc **hors** du conteneur parent, qui a `overflow-hidden`. Résultat : la flèche/courbe en L est clippée et invisible.

Sur la capture de référence, le connecteur **sort visuellement vers la gauche** dans la gouttière de l'avatar parent, juste comme Discord.

### 2. Le badge de rôle n'est pas un "pill" interactif
J'ai branché un simple `<img w-3.5 h-3.5>` au lieu de réutiliser **`RoleBadgePopover`** (le composant déjà utilisé pour le username au-dessus, ligne 1559 de ChatArea). Du coup :
- pas de tooltip au survol
- pas de popover détaillé du rôle au clic
- visuel incohérent avec la ligne du message principal

## Correctifs

### A. `src/components/chat/RepliedLine.tsx`
**Réécriture du rendu du connecteur L** pour qu'il soit toujours visible, même quand `indent=0` :
- Utiliser `position: relative` sur le conteneur parent et déplacer le SVG en `position: absolute` avec `left: -30px` ET `pointer-events: none`.
- Ajouter `overflow-visible` explicite sur le conteneur de RepliedLine pour court-circuiter l'`overflow-hidden` hérité.
- Le SVG dessine la courbe partant de bas à gauche (sortant dans la gouttière) jusqu'à droite vers le mini-avatar.

**Remplacer le rendu manuel du badge de rôle** par le composant `RoleBadgePopover` existant :
- Importer `RoleBadgePopover`.
- Quand `authorRoleIcon` (renommé `authorRole`) est fourni, instancier `<RoleBadgePopover role={authorRole} />`.
- Ajouter une prop CSS de réduction (`scale-75` ou wrapper `[&>button>img]:w-3.5 [&>button>img]:h-3.5`) pour la taille compacte.

### B. `src/components/chat/ChatArea.tsx`
- Aux deux emplacements (lignes 1633 et 1779), changer la prop `authorRoleIcon={...}` en `authorRole={memberRoles?.get(...)?.[0] ?? null}` (passer l'objet rôle complet, pas un sous-objet manuel) pour permettre à `RoleBadgePopover` d'afficher le tooltip + popover.
- Garantir que le conteneur parent **autour** de `RepliedLine` n'a pas `overflow-hidden` qui clippe la gouttière. Si besoin, wrapper dans `<div className="overflow-visible">` ou retirer `overflow-hidden` du parent direct quand un `RepliedLine` est présent.

### C. `src/components/threads/ThreadView.tsx`
- Idem : passer `authorRole={topRole ?? null}` au lieu de l'objet manuel.
- Vérifier que le conteneur du message dans ThreadView n'a pas non plus `overflow-hidden` au-dessus.

### D. `src/components/channels/announcement/AnnouncementComments.tsx` & `src/components/channels/media/MediaComments.tsx`
- Même mise à jour : passer `authorRole={role}` complet à `RepliedLine`.
- Vérifier `overflow-visible` sur le conteneur parent du commentaire.

### E. DM (`DMConversation.tsx`, `MobileMessageBubble.tsx`)
- Pas de rôle ⇒ pas de badge à passer (déjà conforme).
- Vérifier que la gouttière à gauche reste visible (pas de clip).

## Résultat attendu (strictement la capture)

```
↰ [avatar] @Adrien_Sama [HYTL pill] Message de réponse.
   [Avatar parent] Adrien_Sama 08:54
                   Message répondu.
```

- Connecteur L visible, qui descend depuis la zone de l'avatar du message principal vers la ligne de réponse.
- Pseudo coloré avec couleur de rôle.
- Badge `HYTL` rendu via `RoleBadgePopover` (cliquable, hover-tooltip).
- Comportement strictement identique sur ChatArea, ThreadView, AnnouncementComments, MediaComments — et inchangé sur DM/Mobile (sans rôle).

## Détails techniques

- Aucun changement de schéma ni de regex `parse-reply` (déjà conforme depuis l'itération précédente).
- `RoleBadgePopover` est réutilisé tel quel ; un wrapper CSS local le redimensionne en taille compacte sans modifier le composant.
- Le conteneur `flex-1 min-w-0 overflow-hidden` de ChatArea sera adapté avec `overflow-visible` uniquement sur la ligne de la réponse, pour ne pas casser le truncate du nom d'auteur.
- Aucun fichier auto-géré touché.

