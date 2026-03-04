

# Analyse complète Desktop vs Mobile — Prompt d'harmonisation

## Audit de parité fonctionnelle

Après analyse exhaustive du codebase, voici l'état actuel et les lacunes identifiées entre les deux interfaces.

---

## 1. Architecture actuelle

**Desktop** : Layout classique 3 colonnes (ServerList + ChannelList + ChatArea/Content + MemberList optionnelle) avec ThreadView en split 60/40, modals pour tous les settings.

**Mobile** : Navigation par pile (stack) avec 3 onglets (Serveurs, Notifications, Profil), overlays animés (framer-motion), swipe-back, bottom nav fixe. L'onglet Serveurs intègre la sidebar serveurs + liste de salons ou DMs côte à côte.

---

## 2. Lacunes identifiées — Fonctionnalités Desktop absentes sur Mobile

### A. UI Design

| Fonctionnalité | Desktop | Mobile | Statut |
|---|---|---|---|
| **Recherche globale** (`GlobalSearchModal`) | Ctrl+K, header | Absente | MANQUANT |
| **Raccourcis clavier** (`KeyboardShortcutsModal`) | Ctrl+/ | N/A mobile | OK (non pertinent) |
| **Barre de résumés IA** (`SummariesBar`) | Intégrée dans ChatArea | Non visible/accessible | MANQUANT |
| **Messages épinglés** (popover header) | Bouton Pin dans header chat | Bouton dans Sheet membres uniquement | PARTIEL |
| **Threads popover** (liste des threads) | Bouton dans header chat | Bouton dans Sheet membres uniquement | PARTIEL |
| **Notifications de salon** (menu complet) | Header chat + ChannelList context menu | Bouton dans Sheet membres | PARTIEL |
| **Toggle liste membres** | Bouton Users dans header | Via Sheet uniquement | OK (adapté) |
| **UserProfileCard** (barre de profil bas) | En bas de la sidebar gauche | Vue Profil séparée | OK (adapté) |
| **VoiceControls** (contrôles vocaux) | Bas sidebar gauche | Flottant au-dessus bottom nav | OK |
| **Invite modal** | Depuis ChannelList | Depuis ServerProfileSheet | OK |
| **Channel settings modal** | Clic droit sur salon | Appui long sur salon | OK |
| **Category settings** | Clic droit sur catégorie | Appui long sur catégorie | OK |
| **Lien externe warning** | Présent | Présent dans MobileChannelListView | OK |
| **Description du salon** dans header | Tooltip/info dans header | Popover Info dans MobileChatView | OK |
| **Server settings** | Modal complète | Modal complète (responsive) | OK |
| **Account settings** | Modal complète | Modal complète (depuis profil) | OK |
| **Discover servers** | Modal | Modal | OK |
| **Create server** | Modal | Modal | OK |
| **DM Call view** | Intégrée dans DMConversation | Intégrée dans DMConversation | OK |
| **Forum, Media, Tasks, Calendar, Announcement, Stage** | Composants dédiés | Wrappés dans FullScreenWrapper | OK |
| **Summaries dropdown** | Dans ChatArea header | MANQUANT | MANQUANT |

### B. UX Design

| Aspect | Desktop | Mobile | Statut |
|---|---|---|---|
| **Navigation historique** (back/forward) | Browser history API | Browser history API + swipe-back | OK |
| **Persistance navigation** | localStorage | localStorage | OK |
| **Drag & Drop réorganisation serveurs** | DnD vertical | DnD vertical (touch sensor, delay 500ms) | OK |
| **Context menus** (clic droit messages) | ContextMenu natif | Appui long → MobileMessageActions | OK |
| **Swipe entre onglets** | N/A | Implémenté (useSwipeTabs) | OK |
| **Recherche dans les salons** | Input search dans ChannelList | Input search dans MobileChannelListView | OK |
| **Safe area insets** | N/A | Gérés (env safe-area) | OK |
| **Clavier virtuel** | N/A | Ajustement via visualViewport API | OK |
| **Pinned messages** en tant que panneau dédié | Popover dans header chat | Accessible uniquement depuis Sheet membres | DEGRADÉ |
| **Threads** en tant que panneau dédié | Split view 60/40 avec chat | Overlay plein écran séparé | OK (adapté) |
| **Changement de salon sans retour** | Clic direct dans sidebar | Nécessite retour → liste → sélection (sauf depuis tab serveurs) | OK (stack nav) |

### C. Composants manquants ou à améliorer

1. **GlobalSearchModal** — Aucun accès sur mobile. Ajouter un bouton Search dans le header ou les actions rapides.
2. **SummariesBar** — Le système de résumés IA n'est pas accessible sur mobile. Ajouter un point d'entrée (bouton ou section).
3. **Pinned Messages** — Déplacer l'accès aux messages épinglés dans le header du chat mobile (pas seulement dans le Sheet membres).
4. **Threads Popover** — Idem, accès direct depuis le header du chat mobile.
5. **Notification settings par salon** — Accès direct depuis le header chat ou via un menu dans l'icône info.

---

## 3. Prompt complet pour harmonisation

Voici le prompt à utiliser pour implémenter toutes les corrections :

---

**PROMPT :**

Harmonise l'interface mobile pour qu'elle intègre l'intégralité des fonctionnalités desktop. Voici les changements à effectuer :

### Header du chat mobile (`MobileChatView.tsx`)
1. **Ajouter les icônes manquantes dans le header** (à droite, avant le bouton Members) :
   - Bouton **Recherche globale** (Search) → ouvre `GlobalSearchModal`
   - Bouton **Messages épinglés** (Pin) → ouvre un popover avec `usePinnedMessages`
   - Bouton **Threads** (StreamlineThreads) → ouvre un popover avec `ThreadsPopover`
   - Bouton **Résumés IA** (StreamlineSummaries) → ouvre la `SummariesBar`/dropdown

2. **Retirer ces icônes du Sheet membres** puisqu'elles seront dans le header du chat. Garder uniquement la liste des membres dans le Sheet.

3. **Notifications de salon** : Ajouter un bouton Bell dans le header du chat → popover avec les 3 options (Tous, Mentions, Aucun) via `ChannelNotificationMenu` ou le même popover existant.

### Recherche globale mobile (`MobileLayout.tsx` + `MobileServersView.tsx`)
4. **Ajouter un bouton de recherche globale** dans le header de la vue Serveurs (onglet principal) qui ouvre `GlobalSearchModal` avec le contexte du serveur actif.

### Résumés IA mobile
5. **Ajouter l'accès aux résumés** dans le chat mobile : soit un bouton dans le header qui affiche la `SummariesBar` en mode dropdown/sheet, soit une section collapsible en haut de la zone de messages.

### Améliorations UX
6. **Header du chat mobile** : Utiliser des icônes plus compactes (w-4 h-4) avec espacement réduit pour faire tenir toutes les actions.
7. **Responsive des popovers** : S'assurer que tous les popovers utilisent `collisionPadding={8}` et des largeurs adaptées (`w-[calc(100vw-2rem)]` max).

### Cohérence visuelle
8. Garder le même design system (couleurs HSL 218°, polices gg sans, arrondis, espacements).
9. Les popovers et sheets doivent utiliser `rounded-xl` de manière cohérente.
10. Les transitions doivent rester fluides (spring stiffness 400, damping 35).

### Récapitulatif des fichiers à modifier :
- `src/components/mobile/MobileChatView.tsx` — Header enrichi avec Pin, Threads, Search, Summaries, Notifications
- `src/components/mobile/MobileLayout.tsx` — Passer les props nécessaires (serverId, channels, members) pour GlobalSearchModal
- `src/components/mobile/MobileServersView.tsx` — Bouton recherche dans le header
- `src/components/mobile/MobileHomeView.tsx` — Vérifier la cohérence avec les améliorations

---

Ce prompt couvre l'intégralité des écarts identifiés. Les fonctionnalités déjà correctement adaptées (DnD, swipe, threads en plein écran, responsive modals, voice controls) sont conservées telles quelles.

