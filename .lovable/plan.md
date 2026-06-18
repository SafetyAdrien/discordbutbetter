# Plan mobile — profil + salons

## Partie 1 — Profil plein écran sur mobile (dans un serveur)

Aujourd'hui, taper l'avatar/nom d'un membre dans le chat ouvre `UserProfilePopup` (Dialog flottant). Sur mobile, on veut une **vue plein écran** qui masque la bottom nav et qui se ferme via swipe gauche→droite.

### Approche

1. Créer `src/components/mobile/profile/MobileUserProfileSheet.tsx` :
   - Reprend les données affichées par `UserProfilePopup` (avatar, bannière, statut, bio, rôles, mutuels, notes, calendrier, actions DM/ami).
   - Présentation plein écran : `position: fixed inset-0 z-50`, slide-in `x: 100% → 0` via framer-motion, swipe-back via `useSwipeBack({ fullScreen: true })`.
   - Header compact avec bouton retour (chevron) + menu kebab (Bloquer, Copier ID, etc.).
2. Dans `ChatArea.tsx` : remplacer `UserProfilePopup` par `MobileUserProfileSheet` quand `useIsMobile()` est `true` (sinon garder le popup desktop).
3. Exposer un flag global `--mobile-profile-open` (data-attribute sur `<html>`) que `MobileLayout` lit pour masquer `MobileBottomNav` (similaire au flag `hideBottomNav` déjà en place pour le clavier).
4. Swipe back ferme la fiche profil. La vue Chat reste sous-jacente — l'utilisateur retombe naturellement dans la liste salons/serveurs en re-swipant (gestes déjà gérés par `chatSwipe` / `channelSwipe`).

## Partie 2 — Refonte affichage messages par type de salon (mobile)

Pour chaque type non-texte, créer/adapter un wrapper mobile qui réutilise la logique métier mais avec une présentation dense et tactile.

### Salons à traiter

| Type           | Composant cible                                         | Adaptations mobile                                                                                                                  |
| -------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `text`         | `ChatArea` via `MobileChatView` (déjà ok)               | Vérifier paddings, bulles, replies. Ajouter `min-w-0` aux conteneurs.                                                               |
| `announcement` | idem text + bandeau "Suivre" déjà présent               | Vérifier responsive du bandeau follow.                                                                                              |
| `voice`        | `VoiceChannelView`                                      | Header compact, grille participants 1-col en portrait, contrôles en barre fixe basse.                                               |
| `stage`        | `StageChannel`                                          | Liste speakers/audience en sections empilées, boutons larges.                                                                       |
| `media`        | `MediaChannel`                                          | Grille posts 2-col (au lieu de 3-4), miniature ratio 1:1, compteurs en pied de carte.                                               |
| `forum`        | `ForumChannel`                                          | Cartes posts en pile pleine largeur, badge type+tag en ligne, FAB "+ Nouveau post".                                                 |
| `tasks`        | `TasksChannel`                                          | Colonnes Kanban en tabs swipables (To do / In progress / Done), carte tâche pleine largeur.                                         |
| `calendar`     | `CalendarChannel`                                       | Vue agenda liste par défaut (au lieu de grille mois), bouton "Mois" en alternative.                                                 |

### Mécanique

- Détection : `useIsMobile()` dans chaque composant top-level de salon.
- Extraire les variantes mobiles en sous-composants `*.mobile.tsx` colocalisés pour limiter le bruit.
- Réutiliser `FullScreenWrapper` (déjà dans `MobileLayout`) pour header standardisé Back + Titre.
- Conserver toute la logique de données / mutations : seules les présentations changent.

## Détails techniques

- `useIsMobile` existe déjà dans `src/hooks/use-mobile.tsx`.
- `useSwipeBack` est prêt à l'emploi (`fullScreen: true` désactive la zone edge-only).
- Bottom-nav hide : ajouter dans `MobileLayout`
  ```ts
  const [profileOpen, setProfileOpen] = useState(false);
  const hideBottomNav = (isKeyboardOpen && isInputFocused) || profileOpen;
  ```
  et exposer un contexte léger `MobileChromeContext` pour que `MobileUserProfileSheet` puisse setter `profileOpen`.
- Aucun changement de schéma DB. Aucun changement de logique métier.

## Livrables

1. `MobileUserProfileSheet.tsx` + intégration `ChatArea`.
2. Contexte/flag pour masquer la bottom nav.
3. 7 variantes mobiles (text/announcement déjà ok → seulement vérifs + 5 nouvelles : voice, stage, media, forum, tasks, calendar).
4. Pas de migration, pas de nouveau secret.

## Hors scope

- DM (déjà mobile-natif).
- Threads (déjà `MobileThreadView`).
- Modifications de logique permissions/realtime.
