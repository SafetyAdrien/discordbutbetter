
# Plan : Interface Mobile Complete

## Etat actuel

L'application est construite pour le desktop uniquement : une barre de serveurs fixe a gauche (72px), une liste de salons (240px), une zone de chat centrale, et un panneau de membres a droite. Sur mobile, tout s'empile et deborde. Le seul ajustement existant est le masquage du panneau de membres quand `isMobile` est vrai.

## Architecture proposee

L'interface mobile adopte un modele de **navigation par pages empilees** (stack navigation) avec une barre de navigation fixe en bas, identique a l'application Discord mobile.

```text
+---------------------------+
|   Header contextuel       |
+---------------------------+
|                           |
|   Contenu principal       |
|   (une seule vue a la     |
|    fois, plein ecran)     |
|                           |
+---------------------------+
| Home | Servers | Notif | You |
+---------------------------+
```

## Phase 1 : Infrastructure mobile

### 1.1 Hook `useBreakpoint` ameliore
- Fichier : `src/hooks/useBreakpoint.ts` (nouveau)
- Fournir `isMobile` (<640px), `isTablet` (640-1024px), `isDesktop` (>1024px)
- Reutilisable dans tous les composants

### 1.2 Composant `MobileLayout`
- Fichier : `src/components/mobile/MobileLayout.tsx` (nouveau)
- Wrapper qui affiche le contenu mobile quand `isMobile` est vrai
- Contient la barre de navigation en bas (MobileBottomNav)
- Gere l'etat de navigation mobile (onglet actif, historique de vues)

### 1.3 Barre de navigation inferieure (`MobileBottomNav`)
- Fichier : `src/components/mobile/MobileBottomNav.tsx` (nouveau)
- 4 onglets : Accueil (DMs/Amis), Serveurs, Notifications, Profil
- Fixee en bas avec `pb-safe` pour les iPhones avec encoche
- Icones + labels, badge de notifications non lues
- Style : fond `bg-card/95`, `backdrop-blur-xl`, bordure superieure subtile

## Phase 2 : Vues principales mobile

### 2.1 Onglet Accueil (DMs)
- Fichier : `src/components/mobile/MobileHomeView.tsx` (nouveau)
- Liste des conversations DM en plein ecran
- Barre de recherche en haut
- Bouton flottant "Nouveau message"
- Tap sur une conversation -> pousse `MobileDMConversation` par-dessus (plein ecran)

### 2.2 Onglet Serveurs
- Fichier : `src/components/mobile/MobileServersView.tsx` (nouveau)
- Grille de serveurs (icones larges, 3 colonnes) ou liste horizontale scrollable en haut + liste des salons en dessous
- Tap sur un serveur -> affiche la liste des salons
- Tap sur un salon -> pousse la vue de chat plein ecran

### 2.3 Vue Chat Mobile
- Fichier : `src/components/mobile/MobileChatView.tsx` (nouveau)
- Header avec bouton retour, nom du salon, icones d'action
- Zone de messages plein ecran avec scroll
- Input de message en bas avec clavier adaptatif
- Swipe droite -> affiche le panneau des membres en overlay (Sheet)
- Swipe gauche -> retour a la liste des salons

### 2.4 Vue DM Mobile
- Fichier : `src/components/mobile/MobileDMView.tsx` (nouveau)
- Similaire au chat mais avec header adapte (avatar, nom, statut)
- Boutons appel audio/video dans le header
- Swipe droite -> panneau info utilisateur (Sheet)

## Phase 3 : Adaptation des composants existants

### 3.1 Modales -> Drawers sur mobile
- Modifier les modales principales pour utiliser `Drawer` (vaul) sur mobile au lieu de `Dialog` :
  - `CreateServerModal` : Drawer depuis le bas
  - `CreateChannelModal` : Drawer depuis le bas
  - `ServerSettingsModal` : plein ecran sur mobile
  - `AccountSettingsModal` : plein ecran sur mobile
  - `ChannelSettingsModal` : plein ecran sur mobile
  - `NewMessageModal` : Drawer depuis le bas
  - `DiscoverModal` : plein ecran sur mobile
  - `GlobalSearchModal` : plein ecran sur mobile
  - `UserProfilePopup` / `FullUserProfileModal` : Sheet/Drawer depuis le bas
- Creer un composant utilitaire `ResponsiveModal` qui choisit automatiquement entre Dialog et Drawer selon le breakpoint

### 3.2 Context menus -> Long press menus
- Sur mobile, les context menus (clic droit) ne fonctionnent pas
- Ajouter un handler `onLongPress` sur les messages pour afficher un Sheet avec les memes actions (modifier, supprimer, reagir, copier)
- Fichier : `src/hooks/useLongPress.ts` (nouveau)
- Modifier `UniversalMessageContextMenu` pour supporter le mode mobile (long press -> Sheet)

### 3.3 Hover toolbar -> Action sheet
- Le hover toolbar (`UniversalMessageActions`) n'existe pas sur mobile (pas de hover)
- Sur mobile, les actions sont accessibles uniquement via long press (action sheet)

### 3.4 Panneau des membres
- Sur mobile : accessible via Sheet (slide depuis la droite) avec un bouton dans le header du chat
- Fichier existant : `src/components/layout/MemberList.tsx` -- ajout du support Sheet

### 3.5 MessageInput mobile
- Le composant `MessageInput` doit s'adapter : icones compactes, picker d'emoji en Sheet
- Le bouton d'envoi remplace l'icone quand du texte est saisi
- Gestion du viewport quand le clavier virtuel s'ouvre (resize, scroll to bottom)

## Phase 4 : Navigation et transitions

### 4.1 Systeme de navigation par pile (stack)
- Fichier : `src/components/mobile/MobileNavigationStack.tsx` (nouveau)
- Gere l'empilement des vues : serveurs -> salons -> chat -> thread
- Transitions animees (slide left/right) avec `framer-motion`
- Bouton retour dans chaque header
- Support du swipe-back (geste natif iOS/Android)

### 4.2 Gestion du clavier virtuel
- Detecter l'ouverture du clavier (`visualViewport` API)
- Ajuster la hauteur du chat et du input en consequence
- Scroll automatique vers le dernier message quand le clavier s'ouvre

## Phase 5 : Composants specifiques mobile

### 5.1 Threads sur mobile
- Thread en plein ecran (pousse par-dessus le chat)
- Header avec bouton retour + nom du thread

### 5.2 Salons vocaux sur mobile
- Interface simplifiee : grille de participants en plein ecran
- Controles (mute, deafen, disconnect) dans une barre flottante en bas
- Chat vocal accessible via un onglet en bas de l'ecran vocal

### 5.3 Onglet Notifications
- Fichier : `src/components/mobile/MobileNotificationsView.tsx` (nouveau)
- Regroupe les notifications (mentions, DMs, invitations)
- Swipe pour marquer comme lu

### 5.4 Onglet Profil
- Fichier : `src/components/mobile/MobileProfileView.tsx` (nouveau)
- Carte de profil, statut personnalise, parametres rapides
- Acces aux parametres du compte
- Bouton deconnexion

## Point d'entree

### Modification de `src/pages/Index.tsx`
- Detecter `isMobile` en haut du composant
- Si mobile : rendre `<MobileLayout>` au lieu du layout desktop actuel
- Le layout desktop reste inchange

```tsx
// Index.tsx (simplifie)
if (isMobile) {
  return <MobileLayout servers={...} ... />;
}
return <div className="h-screen flex ...">...</div>;
```

## Fichiers a creer (14 nouveaux fichiers)
1. `src/hooks/useBreakpoint.ts`
2. `src/hooks/useLongPress.ts`
3. `src/components/mobile/MobileLayout.tsx`
4. `src/components/mobile/MobileBottomNav.tsx`
5. `src/components/mobile/MobileHomeView.tsx`
6. `src/components/mobile/MobileServersView.tsx`
7. `src/components/mobile/MobileChatView.tsx`
8. `src/components/mobile/MobileDMView.tsx`
9. `src/components/mobile/MobileNavigationStack.tsx`
10. `src/components/mobile/MobileNotificationsView.tsx`
11. `src/components/mobile/MobileProfileView.tsx`
12. `src/components/mobile/MobileChannelListView.tsx`
13. `src/components/mobile/MobileThreadView.tsx`
14. `src/components/ui/responsive-modal.tsx`

## Fichiers a modifier (8 fichiers existants)
1. `src/pages/Index.tsx` -- branchement mobile/desktop
2. `src/components/chat/MessageInput.tsx` -- adaptation mobile
3. `src/components/chat/UniversalMessageContextMenu.tsx` -- support long press
4. `src/components/layout/MemberList.tsx` -- mode Sheet mobile
5. `src/components/chat/EmojiStickerPicker.tsx` -- Sheet sur mobile
6. `src/index.css` -- styles utilitaires mobile (safe areas, etc.)
7. `src/components/profile/UserProfilePopup.tsx` -- Drawer mobile
8. `src/components/dm/DMConversation.tsx` -- adaptations mobiles

## Ordre d'implementation recommande

1. Infrastructure (Phase 1) -- hook, layout, bottom nav
2. Vues principales (Phase 2) -- home, serveurs, chat
3. Adaptations composants (Phase 3) -- modales, context menus, inputs
4. Navigation et transitions (Phase 4) -- stack, animations, clavier
5. Composants specifiques (Phase 5) -- threads, vocaux, notifications, profil

Chaque phase est independante et testable, permettant une validation progressive de l'experience mobile.
