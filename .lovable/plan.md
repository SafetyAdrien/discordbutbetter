# Diagnostic — clic droit cassé sur salons/catégories

## Constat de l'audit lecture-seule

L'inspection statique des points listés dans la demande ne révèle **aucune régression évidente** dans `ChannelList.tsx` ni dans `useScrollAwareContextMenuGuard.ts` :

### 1. `src/components/layout/ChannelList.tsx`

- **Trois `ContextMenuTrigger asChild` conformes** — chacun a exactement UN enfant direct, pas de fragment :
  - Catégorie (L.329) → `<div {...attributes} {...listeners} …>` (un seul `<div>`)
  - Salon (L.725) → `<button …>` (un seul `<button>`)
  - Fond de liste (L.1808) → `<ChannelListScrollContainer …>` (un seul composant)
- **`ChannelListScrollContainer` (L.2216-2233) intact** : c'est bien un `<div>` racine qui spread `{...guard}` (L.2228) après `onScroll`. Non remplacé par un `<div>` inline.
- **`useScrollAwareContextMenuGuard.ts` inchangé** : le guard `onContextMenuCapture` ne `preventDefault` QUE si `movedRef` est vrai OU si un `touchmove` a bougé dans les 350 dernières ms — inactif sur souris desktop, donc ne peut pas expliquer une casse desktop.
- **Aucun `preventDefault`/`stopPropagation` sur `contextmenu`** ajouté par erreur. Les `stopPropagation` trouvés (L.337, 351, 506, 509, 771, 783, 795) sont tous sur `onClick` d'éléments enfants (boutons Plus/Settings/UserPlus/MessageSquare, thread nested), ce qui est intentionnel et n'affecte pas le `contextmenu`.
- Import `ContextMenu*` (L.51-57) présent, correct.

### 2. `src/pages/Index.tsx` (contexte recherche récent)

- L'overlay `<button className="absolute inset-0 bg-black/40 z-10 …">` (L.723-728) et le wrapper popover (L.731 `absolute left-3 right-[52px] top-3 z-20`) sont **scopés dans `<div className="relative w-full sm:w-60 h-full">` de la colonne membres** (L.719). Ils ne recouvrent PAS la colonne `ChannelList` géographiquement, et n'apparaissent que quand `showGlobalSearch && !searchSubmitted`.
- Aucun listener global `contextmenu` ajouté par `MessageSearchPanel.tsx`.

## Hypothèses restantes (à valider en runtime)

Puisque la structure est saine, la casse vient probablement d'un **élément runtime invisible en lecture statique**. Trois pistes à investiguer dans l'ordre :

1. **Overlay/portal résiduel** — un `Popover`/`Dialog`/`Sheet` de la nouvelle barre de recherche (ou de sa modale filtres) resterait monté au niveau `document.body` (portail Radix) avec un backdrop qui capture `contextmenu` en `pointer-events: auto` sur toute la fenêtre. Vérifier via DevTools > Inspect element au clic droit ce qui reçoit vraiment l'événement, et lister les `[data-radix-*]` restants dans le DOM après fermeture du popover recherche.
2. **Listener global `contextmenu` ajouté récemment** — chercher tous les `addEventListener('contextmenu', …)` du projet (notamment `useImageGuardProps`, `self-xss-warning`, `PresenceContext`, ou tout hook monté globalement) et vérifier qu'aucun ne fait `preventDefault()` sans filtrer sa cible.
3. **Régression Radix ContextMenu par un ancêtre** — un ancêtre (nouveau wrapper de layout autour de la sidebar) aurait pu ajouter `onContextMenu={e => e.preventDefault()}` en capture. À vérifier en remontant le DOM depuis un item salon dans DevTools.

## Plan de correction (à exécuter au tour build)

1. **Reproduction** — Ouvrir la preview, Playwright headless :
   - Right-click sur un `[data-testid="channel-item"]` (ou sélecteur équivalent) → observer `page.on('console')` et vérifier si un `ContextMenuContent` apparaît dans le DOM.
   - Capture screenshot avant/pendant le right-click.
   - Loguer `event.defaultPrevented` via un listener `contextmenu` capture temporairement injecté dans la page (`page.addInitScript`) pour savoir QUI l'annule.
2. **Recherche listeners globaux** — `rg -n "addEventListener\(['\"]contextmenu"` sur tout `src/`, et `rg -n "onContextMenu"` sur les fichiers touchés dans les 5 dernières PRs (`MessageSearchPanel.tsx`, `SearchFiltersModal.tsx`, `Index.tsx`, `MemberList.tsx`).
3. **Inspection portails Radix** — après ouverture puis fermeture du popover recherche, script Playwright qui liste `document.querySelectorAll('[data-radix-popper-content-wrapper], [data-radix-portal]')` — un backdrop orphelin serait le coupable.
4. **Fix ciblé** selon la cause identifiée :
   - Si overlay Radix résiduel → forcer démontage propre (contrôler `open` du Popover concerné, ou `modal={false}`).
   - Si listener global → ajouter un filtre `if (!e.target.closest('[data-radix-context-menu-trigger]')) …` avant `preventDefault`.
   - Si `onContextMenu` ancêtre → retirer la ligne fautive.
5. **Non-régression** — ajouter un test Vitest inspiré de `UniversalMessageContextMenu.test.tsx` : right-click sur un item de `ChannelList` doit ouvrir un `menuitem` "Marquer comme lu".
6. **Vérification finale** — `tsgo --noEmit` propre (hors erreurs connues), Playwright screenshot du menu contextuel ouvert sur un salon ET une catégorie.

## Ce qui ne sera PAS touché

- La structure des trois `ContextMenuTrigger` de `ChannelList.tsx` (déjà correcte).
- `useScrollAwareContextMenuGuard.ts` (déjà correct).
- La barre de recherche visuelle et son popover (largeur/ancrage 340px verrouillés).
