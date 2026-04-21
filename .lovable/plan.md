

# Suppression des 3 boutons inutiles dans l'en-tête des MP

## Changement

### `src/components/mobile/dm/MobileDMHomeView.tsx`

Supprimer le bloc `<div className="flex items-center gap-0.5 shrink-0">` (lignes 227-261) contenant les 3 boutons :
- Boîte de réception (`Inbox`)
- Amis (`Users`)
- Rechercher (`Search` du header)

Justification :
- Les notifications/inbox sont déjà accessibles via l'onglet Notifs du menu de navigation du bas.
- La recherche est déjà disponible via la barre de recherche située juste en-dessous de l'en-tête.
- Le bouton Amis fait double emploi avec d'autres points d'accès.

## Nettoyage associé

- Retirer `Inbox`, `Users`, `Search` (s'il n'est plus utilisé ailleurs) des imports `lucide-react`. **Note** : `Search` reste utilisé dans la barre de recherche (ligne 267), donc on le garde. Seuls `Inbox` et `Users` sont retirés des imports.
- Supprimer l'état `showSearch` et son setter `setShowSearch` (devenus inutiles).
- Retirer les props devenues inutilisées : `onShowFriends`, `onShowInbox` de l'interface `Props` et de la signature du composant.
- Mettre à jour les composants parents qui passent ces props (`MobileHomeView.tsx` et toute autre référence) pour ne plus les transmettre, et nettoyer la logique `showInbox` devenue morte dans `MobileHomeView`.

## Résultat attendu

- L'en-tête des MP ne contient plus que l'avatar + le titre/sous-titre.
- La barre de recherche reste fonctionnelle juste en-dessous.
- Aucun bouton redondant ; navigation cohérente avec le menu du bas.

