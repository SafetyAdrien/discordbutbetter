# Plan — Refonte Mobile Universelle

## 1. État actuel (audit)

**Détection responsive**
- `useBreakpoint.ts` : seuils en `window.innerWidth` (xs<480, md<768…), pas d'écoute `matchMedia`, pas de prise en compte de `dvh`/`svh`, du DPR, du `visualViewport`, ni du safe-area horizontal (notches paysage).
- `use-mobile.tsx` : duplique la logique avec un seul breakpoint 768.
- `index.css` : 4 media queries mobiles (`640`, `374`, `428–640`, `1023`). Aucune règle pour 360, 390, 393, 412, 430, ni pour les écrans très hauts (ratio ≥ 20:9 type Redmagic 6 : **387 × 819 CSS px**, DPR 2.75).
- Pas de `viewport-fit=cover` vérifié dans `index.html`, safe-area uniquement bottom/top.

**Couches mobiles existantes** (18 fichiers, ~4 527 LOC)
- Layout : `MobileLayout` (759), `MobileNavigationStack`, `MobileBottomNav`.
- Vues : Home, Servers, ChannelList (859), Chat (415), Notifications, Profile, Thread, DM (dossier), Profile (dossier).
- Overlays : `MobileChannelDetailSheet`, `MobileMoreActionsSheet`, `MessagePreviewSheet`, `MobileMessageActions`, `MobilePollActions`, `VoicePiP`, `MobilePullIndicator`, `SwipeToReplyRow`.

**Problèmes observés**
- Tailles tactiles incohérentes (`min-height: 36px` pour boutons < recommandation 44px iOS / 48dp Android).
- Aucun support explicite des très petits écrans (320–360) ni des très grands phablets (≥ 428).
- Pas de gestion du paysage mobile ni du clavier virtuel (`visualViewport`).
- Sheets/Drawers (`AdaptiveSheet`) basés sur un seul flag `isMobile`, sans variante pour écrans hauts.
- Voice PiP, modals serveur, paramètres, role editor, channel-settings, account-settings → utilisent encore les composants desktop sur mobile dans plusieurs cas.

## 2. Objectifs

1. Détecter **toutes** les tailles smartphone modernes (320 → 480 CSS px largeur, ratios 16:9 à 21:9, DPR 1 à 4).
2. Unifier la détection (un seul hook source de vérité) + tokens CSS responsive.
3. Auditer **chaque écran/overlay** et garantir : zones tactiles ≥ 44px, safe-area 4 côtés, clavier virtuel respecté, paysage géré.
4. Cas spécial **Nubia Redmagic 6** (6.8", 387×819 CSS, 20:9, 165Hz, pas de notch, bords latéraux courbes) : pleine hauteur via `dvh`, marges horizontales sûres (>= 8px), animations honorant `prefers-reduced-motion`.

## 3. Plan d'action

### Phase A — Fondations responsive
1. **Refonte `useBreakpoint`** : palier officiel
   ```
   xxs <360 | xs 360-389 | sm 390-427 | md 428-479 | phablet 480-639
   tablet 640-1023 | desktop ≥1024
   ```
   + `isShortViewport` (<700 dvh), `isTallViewport` (≥820 dvh, cible Redmagic), `isLandscape`, `dpr`, `hasHover`, `pointerFine`.
   Implémentation via `matchMedia` (perf) + `visualViewport` resize.
2. **Supprimer** `use-mobile.tsx` (remplacer les imports par `useBreakpoint`).
3. **`index.html`** : `viewport-fit=cover`, `interactive-widget=resizes-content`.
4. **`index.css`** : ajouter tokens `--app-h: 100dvh` (fallback `100vh`), `--safe-l/r/t/b`, classes `h-app`, `min-h-app`, `pl-safe`, `pr-safe`. Nouvelles media queries : 360, 390, 412, 430, et `@media (min-aspect-ratio: 20/9)` pour écrans longs (Redmagic, Galaxy, Pixel Pro).
5. **`tailwind.config.ts`** : screens alignés sur les paliers + `screens: { tall: { raw: '(min-height: 820px)' }, short: { raw: '(max-height: 700px)' } }`.

### Phase B — Audit composant par composant
Pour chaque écran/overlay listé en §1, vérifier et corriger :
- hauteur via `h-app` (dvh), pas `h-screen`.
- safe-area 4 côtés sur les conteneurs racine et les barres flottantes (BottomNav, VoicePiP, composer).
- tap targets ≥ 44×44, espacement vertical ≥ 8px entre cibles.
- typographies fluides (`clamp()`), troncature `line-clamp`.
- support clavier (composer chat, modals texte) via `visualViewport`.
- mode paysage : layouts en 2 colonnes pour `MobileChatView` et `DMConversation` si `isLandscape && width≥640`.

Liste exhaustive à passer (build à découper en sous-tâches) :
```
Layout/Nav: MobileLayout, MobileNavigationStack, MobileBottomNav, MobilePullIndicator
Home/Listes: MobileHomeView, MobileServersView, MobileChannelListView, MobileNotificationsView, MobileProfileView, mobile/dm/*, mobile/profile/*
Chat: MobileChatView, MobileThreadView, MobileMessageActions, MessagePreviewSheet, MobilePollActions, SwipeToReplyRow
Voice: VoicePiP, VoiceChannelView, voice/*
Overlays: MobileChannelDetailSheet, MobileMoreActionsSheet, AdaptiveSheet, ResponsiveModal
Settings (à mobiliser): AccountSettingsModal, ServerSettingsModal, ChannelSettingsModal, CategorySettings, RoleEditor, RoleManager, ProfileSettings, ServerProfileEditModal
Modals: CreateServer/Channel/Category/Invite, JoinServer, Discover, GlobalSearch, ExternalLinkWarning, KeyboardShortcuts, AddFriend, NewDM, CreateGroup, IncomingCall, EveryoneHerePopup
Channels spéciaux: Announcement, Calendar, Forum, Media, Stage, Tasks, VoiceChannelView (vérifier rendu mobile)
```

### Phase C — Cas Nubia Redmagic 6 & cousins (ratio ≥ 20:9, ≥ 820 dvh)
- Utiliser `tall:` Tailwind pour : agrandir liste DM/canaux, sticky composer plus bas (12px marge), VoicePiP repositionnable plus haut.
- Marges horizontales `px-3` minimum sur conteneurs racine pour éviter bords courbes.
- Tester sur tailles cibles : 320×568 (iPhone SE1), 360×640 (Android bas), 375×667 (SE2/3), 390×844 (iPhone 14), 393×852 (iPhone 15), 412×915 (Pixel 8 Pro), 414×896 (XR), 428×926 (Pro Max), **387×819 (Redmagic 6)**, 430×932 (15 Pro Max). Vérification via `browser--set_viewport_size`.

### Phase D — QA
- Snapshot visuel sur 8 viewports clés via `browser--view_preview`.
- Vérifier console (pas d'overflow horizontal), Lighthouse mobile.

## 4. Détails techniques

- **`dvh` vs `vh`** : `100dvh` exclut les barres dynamiques mobiles. Fallback `100vh` via `@supports`.
- **`visualViewport`** : écouter `resize` pour ajuster la position du composer quand le clavier s'ouvre (offset = `window.innerHeight - visualViewport.height`).
- **Tap target** : passer la règle CSS de `min-height: 36px` à `44px` pour `button/a/[role="button"]` sous 640px.
- **Safe-area horizontale** : `env(safe-area-inset-left/right)` ajouté aux barres et BottomNav.

## 5. Livrable
Refonte en 4 PR logiques (A→D). Aucune régression desktop : les nouvelles règles sont gated par media queries ≤ 1023px ou par flags `useBreakpoint`.

## 6. Hors scope
- Refonte visuelle (couleurs/typo) : ce plan reste fonctionnel/responsive.
- Nouvelles fonctionnalités produit.
