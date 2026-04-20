

# Audit mobile complet — alignement standards Discord

## Diagnostic actuel vs Discord mobile

### Ce qui existe déjà (acquis Lots 1-7)
- Bottom nav 4 onglets (Serveurs / Discuter / Notifs / Vous), badges, haptics
- Swipe-back depuis l'edge gauche (`useSwipeBack`, edge 30 px / threshold 100 px)
- Swipe horizontal entre onglets (`useSwipeTabs`)
- `useSwipeToReply` créé mais **non câblé** dans `ChatArea` / `DMConversation` / `ThreadView`
- `useLongPress` + `MobileMessageActions` (drawer avec quick reactions + menu)
- `useReducedMotion` gating animations
- FAB sur Forum/Tasks/Media, vue Agenda Calendar, hauteur `100svh`

### Lacunes vs l'app Discord officielle

#### 1. Gestes manquants ou incomplets
- ❌ **Swipe-to-reply non branché** sur les bulles de message (le hook existe mais n'est utilisé nulle part)
- ❌ **Pas de pull-to-refresh** sur DM list, channel list, notifications, server discovery
- ❌ **Pas d'edge-swipe dans DM** (DMConversation.tsx ne consomme pas `useSwipeBack`)
- ❌ **Pas de pinch-to-zoom** sur images dans `MessageAttachments`
- ❌ **Pas de double-tap pour réagir** (Discord = double-tap = ❤️)
- ❌ **Drag delay 500 ms** trop long pour réordonner serveurs (Discord ≈ 250 ms après long-press feedback)

#### 2. Clavier virtuel & viewport
- ❌ **Pas de support `visualViewport`** : quand le clavier s'ouvre, l'input est masqué et le scroll de la liste de messages ne s'ajuste pas (sur iOS Safari c'est critique)
- ❌ Bottom nav reste visible sous le clavier sur Android (devrait se masquer en focus input)
- ❌ Hauteur `100svh` figée — un input focus + clavier ouvert provoque des sauts visuels en orientation paysage

#### 3. En-tête de chat mobile (`MobileChatView`)
- ⚠️ **Trop d'icônes en barre** (Info, Pin, Threads, Summaries, Bell, Members) sur 320–375 px = débordement
- ❌ Pas de menu **« More » (kebab)** mobile pour regrouper les actions secondaires
- ❌ **Pas de tap sur le titre** pour ouvrir le détail du salon (Discord = tap header = sheet salon)
- ❌ Pas d'**indicateur de connexion** (online dot, voice connection)

#### 4. Long-press & feedback
- ⚠️ Le long-press sur message ouvre un drawer mais **sans aperçu épinglé du message** (Discord met le message au-dessus du menu, blur le reste)
- ❌ Pas de **survol haptique progressif** (Discord pulse 60 ms à 250 ms puis commit à 400 ms)
- ❌ Pas de **scrim / backdrop blur** lors du long-press

#### 5. Navigation & history
- ⚠️ `MobileServersView` montre TOUTE l'app dans 72 px + panel : sur petits écrans (320–360 px), la zone utile passe à 248 px → boutons de salon coupés
- ❌ Pas de **collapse de la rail serveurs** par swipe (Discord = swipe gauche → cache la rail, pleine largeur du panel)
- ❌ Pas de **bottom sheet « Profil utilisateur »** depuis tap sur avatar dans les messages (existe en popover, pas adapté tactile)

#### 6. Accessibilité (A11y)
- ❌ Aucun `aria-live` (toasts annoncés, nouveaux messages mention)
- ⚠️ `role="status"` absent sur indicateurs de chargement
- ⚠️ Boutons icon-only ont `aria-label` mais **pas de `title`** secondaire
- ❌ Pas de **focus trap** dans les bottom sheets (drawer)
- ❌ Pas de **gestion VoiceOver/TalkBack** des swipes (annonce "Glisser pour répondre")
- ❌ **Contraste insuffisant** des badges sur surfaces sombres (à mesurer)
- ❌ Pas de **mode "agrandir le texte"** (Discord respecte la taille système)

#### 7. Vue voice mobile
- ⚠️ `VoiceChannelView` rendu en plein écran sans **mini-PiP draggable** quand l'utilisateur navigue ailleurs
- ❌ Bouton « raccrocher » non flottant en bas (caché si scroll)
- ❌ Pas de **gesture swipe-down** pour minimiser la vue voice

#### 8. Performance perçue
- ❌ Pas de **skeletons** spécifiques mobile pour DM list / messages (juste spinner)
- ❌ Pas de **virtualisation** de la liste de messages (sur mobile, scroll lag dès 200 messages)
- ❌ Images attachées non **lazy** au scroll fast

#### 9. Profil mobile (`MobileProfileView`)
- ⚠️ Pas d'accès direct à : amis, comptes connectés, sécurité, sessions, changer mot de passe (tout enfoui dans modal Settings)
- ❌ Pas de **toggle thème clair/sombre rapide** sur la vue profil
- ❌ Pas de **switch de compte** (Discord supporte multi-compte)

#### 10. Notifications mobile (`MobileNotificationsView`)
- ⚠️ **Réutilise `InboxPanel` desktop sans adaptation** : pas de swipe-to-archive, pas de groupes, densité non optimisée
- ❌ Pas de **badge "Tout marquer lu"** flottant en bas
- ❌ Pas de **filtre rapide** (Mentions / Réponses / Threads) en pills

---

## Plan d'amélioration en 8 lots

### **Lot A — Gestes critiques manquants**
1. Câbler `useSwipeToReply` dans :
   - `ChatArea.tsx` (rangée message)
   - `DMConversation.tsx` (rangée message DM)
   - `ThreadView.tsx` (rangée message thread)
   - Visuel : icône `Reply` qui apparaît en fade depuis la gauche, fond `surface-2`, opacité = `progress`
2. Activer `useSwipeBack` dans `DMConversation` pour retour à la liste DM
3. Ajouter **double-tap = réaction ❤️** (`useDoubleTap` hook)
4. Réduire le `delay` du `TouchSensor` server-icons à 250 ms

### **Lot B — Clavier virtuel & viewport**
1. Créer `useVisualViewport` hook → expose `keyboardHeight` et `isKeyboardOpen`
2. Dans `MobileLayout` : `paddingBottom: keyboardHeight` sur le wrapper de chat, masquer la `MobileBottomNav` quand `isKeyboardOpen && isFocusedInput`
3. Auto-scroll bas de liste messages quand le clavier s'ouvre (déjà chat actif)
4. Empêcher le bounce iOS quand input focus (`overscroll-behavior: contain`)

### **Lot C — Long-press premium (style Discord)**
1. Refondre `MobileMessageActions` : 
   - Aperçu du message **figé en haut** (avatar + extrait), backdrop `bg-black/60 backdrop-blur-md`
   - Quick reactions au-dessus de l'aperçu
   - Liste actions en bas
2. Long-press progression : haptic léger à 250 ms, commit haptic medium à 400 ms (raccourcir delay)
3. Ajouter `data-message-id` pour positionner l'aperçu correctement

### **Lot D — Header chat mobile compact**
1. Garder dans header : **Back, Icon, Nom (tappable), Members count, Kebab**
2. Tap sur **Nom** → bottom sheet "Détails du salon" (description, pinned, threads, summaries, notifs)
3. Tap sur **Members count** → bottom sheet membres (existant)
4. **Kebab** → `MobileMoreActionsSheet` avec : Notifs, Search, Pin, Threads, Summaries, Follow

### **Lot E — Pull-to-refresh & rafraîchissement**
1. Créer `usePullToRefresh` hook (touch + Y delta + spring back)
2. Brancher sur :
   - DM list (`MobileHomeView`)
   - Channel list (`MobileChannelListView`)  
   - Notifications (`MobileNotificationsView`)
   - Discover modal
3. Indicateur visuel : petit spinner Material qui descend depuis le top

### **Lot F — A11y & VoiceOver/TalkBack**
1. Ajouter `aria-live="polite"` sur la zone de toasts (Sonner config)
2. `role="status"` + `aria-busy="true"` sur tous les loaders mobile
3. `aria-roledescription="Glisser à droite pour répondre"` sur message rows
4. **Focus trap** sur drawers (radix Drawer ne le fait pas par défaut → ajouter)
5. Boutons icon-only : ajouter `title` en plus de `aria-label`
6. Audit contraste (badges destructive, muted-foreground sur surface-1)
7. Respect `font-size` système → `text-base` au lieu de `text-sm` sur targets clés ; activer Tailwind `text-size-adjust`

### **Lot G — Voice mobile & PiP**
1. Mini-PiP voice draggable quand on quitte le salon vocal mais reste connecté
2. Bouton raccrocher fixe en bottom (au-dessus du nav)
3. Swipe-down pour minimiser `VoiceChannelView` en PiP
4. Indicateur connexion (dot vert) dans `MobileBottomNav` si voice actif

### **Lot H — Profil & Notifications mobile**
1. `MobileProfileView` : ajouter sections directes (Amis, Sécurité, Connexions, Sessions, Apparence) avec navigation interne (pas de modal)
2. Toggle thème rapide en haut
3. `MobileNotificationsView` : remplacer `InboxPanel` par une vue dédiée :
   - Pills filtres (Tout / Mentions / Réponses / Threads)
   - Swipe-left = archiver, swipe-right = marquer lu
   - FAB "Tout marquer lu"

---

## Priorités recommandées

| Lot | Impact UX | Effort | Priorité |
|-----|-----------|--------|----------|
| A — Gestes | Très haute | Moyen | 🔴 P0 |
| B — Clavier | Très haute | Moyen | 🔴 P0 |
| C — Long-press | Haute | Moyen | 🟠 P1 |
| D — Header | Haute | Faible | 🟠 P1 |
| E — Pull-to-refresh | Moyenne | Moyen | 🟡 P2 |
| F — A11y | Haute (légal) | Élevé | 🟠 P1 |
| G — Voice PiP | Moyenne | Élevé | 🟡 P2 |
| H — Profil/Notifs | Moyenne | Moyen | 🟡 P2 |

## Garanties

- Aucune migration DB, aucun changement RLS
- Desktop ≥ 1024 px strictement préservé (gates `isMobile` / `useBreakpoint`)
- Hooks de données inchangés
- Réutilisation des composants existants (`Drawer`, `Sheet`, `MobileMoreActionsSheet`, `useReducedMotion`)
- Lots indépendants, testables isolément

## Détails techniques

- **Nouveaux hooks** : `useVisualViewport`, `usePullToRefresh`, `useDoubleTap`
- **Nouveaux composants** : `MessagePreviewSheet` (long-press refondu), `MobileChannelDetailSheet` (tap header), `VoicePiP`, `MobilePullIndicator`
- **Modifs** : `ChatArea`, `DMConversation`, `ThreadView`, `MobileChatView`, `MobileLayout`, `MobileBottomNav`, `MobileNotificationsView`, `MobileProfileView`, `MessageAttachments` (pinch-zoom), `MobileMessageActions` (preview)
- **CSS** : `overscroll-behavior: contain` sur scroll containers, support `text-size-adjust: 100%`

