

# Amelioration globale de l'interface mobile

## 1. Navigation et transitions

### Geste de swipe-back
Ajouter un geste de glissement horizontal (swipe depuis le bord gauche) pour revenir en arriere sur les vues chat, thread et channel list. Utiliser `framer-motion` avec `dragConstraints` et `onDragEnd` pour detecter le geste et declencher `onBack`.

### Transitions plus fluides
- Les vues `chat` et `thread` glissent depuis la droite (deja en place)
- Ajouter une transition de fade/scale subtile sur le contenu en arriere-plan quand une vue passe au-dessus
- Harmoniser les transitions entre les onglets du bottom nav (crossfade au lieu de switch instantane)

### Bottom nav intelligente
- Masquer la bottom nav avec une animation slide-down quand on est dans un chat (deja fait pour `mobileView.type !== 'tab'`)
- Afficher un mini indicateur de voice/appel en cours au-dessus de la bottom nav quand elle est visible

## 2. Vue chat mobile

### Header ameliore
- Ajouter un bouton de recherche dans le header du chat
- Ajouter un bouton d'info/description du salon (popover avec description + actions rapides)
- Afficher l'icone du type de salon (hash, voice, etc.) a cote du nom

### Interactions messages mobile
- Remplacer le hover toolbar (inutile sur mobile) par un long-press qui ouvre un bottom sheet avec toutes les actions (reagir, repondre, copier, supprimer, etc.)
- Le bottom sheet utilise le composant `Drawer` (vaul) deja installe
- Integrer les reactions rapides en haut du bottom sheet

### Clavier et input
- Ajuster le padding-bottom du chat quand le clavier mobile est ouvert (utiliser `visualViewport` API)
- S'assurer que la zone d'input reste visible et ne soit pas cachee par le clavier

## 3. Profil et parametres mobile

### Page profil enrichie
- Ajouter la banniere de profil en haut (si disponible)
- Ajouter un selecteur de statut en ligne (online/idle/dnd/invisible) sous le nom
- Ajouter l'activite en cours si definie
- Ajouter un lien vers "Modifier le profil" qui ouvre directement le bon onglet dans AccountSettings

### Parametres du compte
- S'assurer que `AccountSettingsModal` est bien adapte au mobile (full-screen au lieu de modal centree)
- Navigation par onglets verticaux sur mobile au lieu de la sidebar desktop

## 4. Vue serveurs

### Indicateur de serveur selectionne
- Ajouter un tooltip/label ephemere quand on tape sur un serveur (le nom du serveur apparait brievement)

### Scroll horizontal des salons
- S'assurer que la liste de salons scrolle bien verticalement sans conflit avec le swipe-back

## 5. Vue DM/Accueil

### Conversation DM
- S'assurer que le bouton retour dans DMConversation ramene bien a la liste de DMs
- Ajouter les appels audio/video depuis le header de la conversation DM sur mobile

### Liste de DMs
- Afficher un apercu du dernier message dans chaque conversation
- Afficher l'heure du dernier message

## Plan technique (fichiers a modifier)

| Fichier | Changements |
|---------|------------|
| `MobileLayout.tsx` | Swipe-back gesture, transitions crossfade entre onglets, bottom nav animation |
| `MobileChatView.tsx` | Header enrichi (icone salon, bouton search, info), channel description popover |
| `MobileHomeView.tsx` | Meilleure integration DM retour, apercu dernier message |
| `MobileProfileView.tsx` | Banniere, selecteur de statut, activite, liens parametres |
| `MobileBottomNav.tsx` | Animation slide in/out, indicateur voice |
| `MobileServersView.tsx` | Tooltip nom serveur au tap |
| Nouveau: `MobileMessageActions.tsx` | Bottom sheet (Drawer) pour les actions sur message en long-press |

L'implementation sera faite fichier par fichier en veillant a ne rien casser sur desktop (les composants mobile sont isoles dans `src/components/mobile/`).

