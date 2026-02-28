

# Completement de l'interface mobile

## Contexte

L'infrastructure mobile de base est en place (MobileLayout, MobileBottomNav, stack navigation, vues principales). Il reste a adapter les composants existants pour qu'ils fonctionnent correctement sur mobile : modales fullscreen, sidebars en sheets, context menus en long press, input adaptatif, etc.

## Changements par fichier

### 1. `src/components/server-settings/ServerSettingsModal.tsx` -- Layout mobile

Le modal actuel utilise un layout sidebar+content fixe (w-56 sidebar). Sur mobile, la sidebar doit devenir un menu scrollable horizontal ou un sheet, et le contenu prend tout l'ecran.

- Importer `useBreakpoint`
- Si `isMobile` : remplacer le layout flex horizontal par un layout vertical
  - Header avec bouton retour + titre + bouton fermer
  - Si aucun onglet selectionne : afficher la liste des sections comme une liste verticale plein ecran
  - Si un onglet est selectionne : afficher le contenu plein ecran avec bouton retour vers la liste
- Le layout desktop reste inchange

### 2. `src/components/account-settings/AccountSettingsModal.tsx` -- Layout mobile

Meme pattern que ServerSettingsModal :
- Importer `useBreakpoint`
- Si `isMobile` : navigation a 2 niveaux (liste des onglets -> contenu de l'onglet)
- Header avec bouton retour
- Boutons deconnexion et suppression de compte accessibles en bas de la liste

### 3. `src/components/modals/DiscoverModal.tsx` -- Plein ecran mobile

- Importer `useBreakpoint`
- Si `isMobile` : masquer la sidebar de categories, afficher les categories en chips horizontaux scrollables sous la barre de recherche
- Grille de serveurs en 1 colonne au lieu de 3
- Le header prend moins de hauteur

### 4. `src/components/modals/GlobalSearchModal.tsx` -- Plein ecran mobile

- Importer `useBreakpoint`
- Si `isMobile` : le Dialog devient plein ecran (`className="h-full max-h-full w-full max-w-full rounded-none"`)
- Les filtres s'affichent en chips scrollables au lieu d'un panneau lateral

### 5. `src/components/modals/CreateChannelModal.tsx` -- Drawer mobile

- Remplacer `Dialog` par `ResponsiveModal` pour que la modale devienne un drawer sur mobile
- Adapter les paddings pour le touch

### 6. `src/components/modals/CreateServerModal.tsx` -- Adaptation mobile

- Importer `useBreakpoint`
- Si `isMobile` : le modal prend tout l'ecran (inset-0, pas de max-w) au lieu de max-w-md centre

### 7. `src/components/chat/MessageInput.tsx` -- Adaptation mobile

- Importer `useBreakpoint`
- Si `isMobile` :
  - Masquer les icones secondaires (BarChart2, Sticker) pour n'afficher que PlusCircle, Smile, et Send
  - Afficher le bouton Send a la place de l'icone quand du texte est present
  - Reduire le padding et les tailles de boutons

### 8. `src/components/chat/EmojiStickerPicker.tsx` -- Sheet mobile

- Importer `useBreakpoint`
- Si `isMobile` : utiliser un Sheet (vaul Drawer) au lieu d'un Popover
- Le picker prend toute la largeur en bas de l'ecran avec hauteur 60vh

### 9. `src/components/profile/UserProfilePopup.tsx` -- Drawer mobile

- Importer `useBreakpoint`
- Si `isMobile` : remplacer le Dialog par un Drawer (slide depuis le bas)
- La carte de profil s'affiche en plein ecran dans le drawer

### 10. `src/components/chat/UniversalMessageContextMenu.tsx` -- Long press Sheet

Le composant supporte deja un mode mobile (verifie precedemment). Il faut s'assurer que :
- Le Sheet d'actions s'affiche correctement avec toutes les options
- Le long press est bien connecte dans `MobileChatView` et `MobileHomeView` (via DMConversation)

### 11. `src/components/dm/DMConversation.tsx` -- Adaptation mobile

- Importer `useBreakpoint`
- Si `isMobile` :
  - Le header affiche un bouton retour (deja supporte via `onBack`)
  - Le panneau info utilisateur (DMUserInfoPanel) s'affiche dans un Sheet au lieu d'un panneau lateral
  - Les controles d'appel sont plus compacts

### 12. `src/components/mobile/MobileHomeView.tsx` -- Ameliorations

- Ajouter une barre de recherche en haut pour filtrer les DMs
- Ameliorer le positionnement du FAB (bouton +) pour eviter le chevauchement avec la bottom nav
- Gerer le retour depuis un DM correctement (remonter au parent MobileLayout)

### 13. `src/components/mobile/MobileLayout.tsx` -- Corrections

- Gerer le cas ou `activeDMId` est set : afficher `DMConversation` en overlay plein ecran (comme pour les chats serveur) avec animation slide-in
- Masquer la bottom nav quand un DM est ouvert en plein ecran
- Ajouter le support du back button depuis le DM

### 14. `src/components/mobile/MobileChannelListView.tsx` -- Ameliorations

- Ajouter un bouton "Creer un salon" (si l'utilisateur a la permission)
- Ajouter un indicateur de presence pour les salons vocaux (nombre de participants)

### 15. `src/components/channel-settings/ChannelSettingsModal.tsx` -- Mobile

- Importer `useBreakpoint`
- Si `isMobile` : le Dialog devient un plein ecran avec navigation a 2 niveaux (liste onglets -> contenu)

### 16. `src/components/category-settings/EditCategoryModal.tsx` -- Mobile

- Utiliser `ResponsiveModal` au lieu de `Dialog` pour un drawer automatique sur mobile

### 17. `src/index.css` -- Styles supplementaires

- Ajouter des utilitaires pour les touch targets minimum (44px)
- Ajouter `touch-action: manipulation` pour eviter le double-tap zoom
- Ajouter le support du viewport meta pour le clavier virtuel

## Ordre d'implementation

1. **Modales fullscreen** (ServerSettings, AccountSettings, Discover, GlobalSearch, ChannelSettings) -- ce sont les plus visibles et cassees sur mobile
2. **Modales drawer** (CreateChannel, CreateServer, EditCategory, UserProfile) -- utiliser ResponsiveModal
3. **Composants adaptatifs** (MessageInput, EmojiPicker, DMConversation)
4. **Corrections MobileLayout** (gestion DM overlay, FAB positioning)
5. **Ameliorations vues** (MobileHomeView search, MobileChannelList actions)

## Points techniques

- Tous les composants utiliseront `useBreakpoint` pour detecter le mode mobile
- Les modales "settings" (ServerSettings, AccountSettings) adopteront un pattern commun : liste -> detail avec animation
- Les petites modales (CreateChannel, EditCategory) utiliseront `ResponsiveModal` pour un drawer automatique
- Le `MessageInput` sur mobile aura un bouton d'envoi visible (fleche) au lieu du raccourci Enter
- Le `EmojiStickerPicker` utilisera un `Drawer` (vaul) en bas d'ecran sur mobile pour un meilleur acces tactile

