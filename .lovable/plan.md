

# Améliorer la page Amis (mobile)

Refonte de `MobileFavoriteFriendsView` pour offrir une expérience accessible, fluide et complète, tout en restant cohérente avec le langage visuel mobile (cards arrondies, haptics, statuts en temps réel).

## Ce que l'utilisateur verra

**1. Header enrichi**
- Titre "Amis" + sous-titre dynamique ("X amis fréquents")
- Action rapide "Ajouter un ami" (ouvre `AddFriendModal`)
- Pill de filtres en haut : `Tous` · `En ligne` · `Favoris` · `En attente`

**2. Barre de recherche persistante**
- Input plein largeur sous le header avec placeholder "Rechercher un ami…"
- Filtre instantané sur display_name + @username
- Bouton clear (×) quand rempli

**3. Demandes d'ami en attente** (badge rouge si > 0)
- Section repliable "En attente (N)" en haut
- Cards distinctes avec boutons Accepter (✓ vert) / Refuser (× rouge) larges (44×44px touch target)
- Distinction visuelle reçue vs envoyée

**4. Sections regroupées par activité**
- 🟢 **Aujourd'hui** — contacts actifs dans les 24h
- 📅 **Cette semaine**
- 🗓️ **Ce mois-ci**
- ⭐ **Favoris** (si filtre activé) — épinglés en tête, étoile pleine
- 👥 **Tous les amis** (filtre Tous) — tri alphabétique pour les amis sans activité récente

**5. Card de contact améliorée**
- Avatar 48px avec ring de statut coloré (online/idle/dnd/offline)
- Display name + custom_status (si présent) ou @username
- Badge compteur de messages discret ("12 msg cette semaine")
- **Swipe-left** révèle 2 actions : ⭐ Favori (toggle) | 💬 Message
- Tap sur la card → ouvre la DM
- Long-press → bottom sheet avec : Voir profil, Mettre en favori, Appeler, Bloquer, Supprimer ami

**6. États vides explicites**
- Empty state illustré + CTA "Ajouter ton premier ami"
- État "Aucun résultat" pour la recherche avec suggestion de réinitialiser

**7. Accessibilité**
- Tous les boutons ≥ 44×44px (Apple HIG)
- `aria-label` sur toutes les actions icônes
- `role="button"` + `tabIndex` corrects
- Haptics légers sur tap, médiums sur swipe action, success sur accept/favoris
- Animations respectent `prefers-reduced-motion`
- Contraste texte AAA sur les compteurs

**8. Pull-to-refresh** en haut pour resynchroniser amis + favoris + fréquence

## Détails techniques

**Fichiers modifiés**
- `src/components/mobile/profile/MobileFavoriteFriendsView.tsx` — refonte complète
- Création `src/components/mobile/profile/MobileFriendCard.tsx` — card swipeable réutilisable
- Création `src/components/mobile/profile/MobileFriendActionSheet.tsx` — bottom sheet long-press

**Données**
- Combine `useFriends()` (liste complète + pending) + `useFrequentDMContacts()` (fréquence) + `useFavoriteFriendIds()` (favoris)
- Hook local `useMergedFriends()` qui croise les 3 sources (Map<userId, MergedFriend>)
- Création/ouverture DM via `useCreateDMConversation` (existant) pour les amis sans conversation

**Interactions**
- Swipe horizontal : réutiliser le pattern de `SwipeToReplyRow` (translate via touch events, seuil 80px)
- Long-press : `useLongPress` (existant, 500ms) → ouvre `AdaptiveSheet`
- Pull-to-refresh : `usePullToRefresh` (existant)
- Recherche : `useState` + filtre client-side (pas de debounce nécessaire, listes < 500 items)

**Filtres**
- Stockés en state local (pas d'URL, sous-page éphémère)
- Le filtre `Favoris` montre uniquement les `favoriteIds`, sans bucketing temporel

**Mutations**
- `useToggleFavoriteFriend` (existant) pour ⭐
- `useAcceptFriendRequest` / `useDeclineFriendRequest` / `useRemoveFriend` (existants)
- Toutes optimistes via les hooks déjà en place

**Performance**
- `useMemo` pour le bucketing et le filtrage
- Pas de virtualisation (liste typiquement < 200 amis)

**Aucune migration DB requise.**

