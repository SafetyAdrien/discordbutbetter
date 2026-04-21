

# Suppression de l'onglet "Discuter" du menu de navigation mobile

## Changements

### `src/components/mobile/MobileBottomNav.tsx`
- Retirer l'entrée `{ id: 'discuss', label: 'Discuter', icon: MessageCircle }` du tableau `tabs`.
- Retirer `'discuss'` du type `MobileTab` -> `'servers' | 'notifications' | 'profile'`.
- Nettoyer l'import inutilisé `MessageCircle` de lucide-react.

### `src/components/mobile/MobileLayout.tsx`
- Retirer `'discuss'` de la validation initiale du tab persistant (ligne 76) : si la valeur persistée est `'discuss'`, retomber sur `'servers'`.
- Retirer `'discuss'` du tableau `TAB_ORDER` (ligne 464) pour que le swipe horizontal ne passe plus par cet onglet.
- Supprimer le bloc de rendu `{activeTab === 'discuss' && (<MobileHomeView .../>)}` (lignes 587-593) car les DMs sont déjà accessibles via le bouton en haut de la `MobileServersView`.
- Supprimer l'import désormais inutilisé de `MobileHomeView` dans `MobileLayout` s'il n'est plus utilisé ailleurs dans ce fichier.

## Résultat attendu
- Le menu de navigation du bas affiche désormais 3 boutons : Serveurs, Notifs, Vous.
- Les MP restent accessibles uniquement via le bouton dédié en haut de la liste des serveurs.
- Aucun crash sur les sessions existantes ayant `'discuss'` persisté (fallback automatique sur `'servers'`).
- Le swipe horizontal entre onglets reste cohérent sur les 3 onglets restants.

