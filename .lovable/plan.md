# Refonte UI Mobile — Détection universelle des écrans

## 1. État actuel (audit)

**Détection actuelle (faible)** — `useBreakpoint` ne connaît que 5 paliers en largeur (`xs<480`, `md<768`...) et `useIsMobile` un seul seuil à 768px. Aucune prise en compte de : hauteur, ratio, DPR, orientation, safe-area (notch / dynamic island / barre nav Android), foldables, taux de rafraîchissement, pointer (touch vs stylet), PWA standalone.

**Surfaces mobiles existantes (34 fichiers, ~8 750 lignes)** :

```
mobile/
├─ MobileLayout (759)            ├─ dm/MobileDMConversation (620)
├─ MobileChannelListView (859)   ├─ dm/MobileDMHomeView (424)
├─ MobileChatView (415)          ├─ dm/MobileDMListItem (388)
├─ MobileServersView (401)       ├─ dm/MobileMessageBubble (298)
├─ MobileProfileView (450)       ├─ dm/MobileDMActionSheet (206)
├─ MobileNotificationsView (342) ├─ dm/MobileDMHeader / MediaGallery
├─ MobileBottomNav (101)         ├─ profile/FavoriteFriends (700)
├─ MobileChannelDetailSheet      ├─ profile/StatusSheet (383)
├─ MobileMoreActionsSheet        ├─ profile/FriendCard (276)
├─ MobileMessageActions          ├─ profile/EditProfile / QRCode / Settings
├─ MobilePollActions             ├─ MessagePreviewSheet / VoicePiP
├─ SwipeToReplyRow               └─ MobileThreadView / NavigationStack
```

À cela s'ajoutent les éléments globaux qui s'affichent en mobile : modales (`Create*Modal`, `GlobalSearchModal`, `JoinServerModal`, `DiscoverModal`...), sheets shadcn, `ChatArea`, `ChannelList`, `MemberList`, `VoiceChannelView`, `ThreadView`, `account-settings/*`, `server-settings/*`.

## 2. Système de détection universel

### 2.1 Nouveau hook `useDevice` (`src/hooks/useDevice.ts`)

Source unique de vérité, basée sur `matchMedia` + `VisualViewport` + `navigator`. Retourne :

| Champ | Source | Usage |
|---|---|---|
| `width`, `height` | `visualViewport` (fallback `innerWidth/Height`) | Layout |
| `dpr` | `devicePixelRatio` + listener `resolution` | Assets @2x/@3x |
| `orientation` | `screen.orientation` | Voice grid, vidéo |
| `aspectRatio` | calc | Tall phones |
| `tier` | dérivé (voir §2.2) | Breakpoints |
| `safeArea` | `env(safe-area-inset-*)` lus via CSS var | Notch / island / gesture bar |
| `hasNotch` | `safeArea.top >= 20 && !standalone-iframe` | Header padding |
| `pointer` | `(pointer: coarse/fine)` | Tailles cibles tactiles |
| `hover` | `(hover: hover)` | Désactive hover states |
| `refreshRate` | `(update: fast)` + estimation rAF | Animations 120 Hz |
| `isStandalone` | `display-mode: standalone` | PWA chrome |
| `isFoldable` | `(spanning: single-fold-*)` + `viewport-segments` | Layout adaptatif |
| `prefersReducedMotion` | media query | Animations |

### 2.2 Nouveaux paliers de largeur (CSS px)

Couvrent **tout le parc smartphone 2018→2026** :

```
tier        max-w   exemples
─────────── ─────── ─────────────────────────────────────────────
mobile-xxs  ≤ 320   iPhone SE 1, vieux Android
mobile-xs   ≤ 360   Galaxy S8/S9, Pixel 4a, iPhone 12 mini
mobile-sm   ≤ 380   iPhone 13/14/15, Pixel 6
mobile-md   ≤ 400   iPhone 14 Pro, Pixel 7/8, Nubia Redmagic 6 (388)
mobile-lg   ≤ 430   iPhone 15 Pro Max, S24 Ultra, OnePlus 12
mobile-xl   ≤ 480   phablets, mode bureau réduit
mobile-tall (height ≥ 900 ET width ≤ 480) — Redmagic 6/8/9, Sony Xperia 1
fold-closed ≤ 320 & ratio < 0.55 — Galaxy Z Fold cover
fold-open   ≥ 600 & ratio 0.9–1.1 — Fold ouvert (bascule tablet)
```

Le **Nubia Redmagic 6** (388 × 863 CSS px, DPR 2.78, 165 Hz, ratio 21:9) tombe en `mobile-md` + `mobile-tall` + `refreshRate: high`.

### 2.3 Tailwind & CSS

- Ajout des breakpoints `xxs/xs/sm-mobile/md-mobile/lg-mobile/xl-mobile` dans `tailwind.config.ts`.
- Variables CSS globales dans `index.css` :
  ```
  --safe-top   : env(safe-area-inset-top,  0px);
  --safe-bot   : env(safe-area-inset-bottom,0px);
  --safe-left  / --safe-right
  --kb-offset  (depuis useVisualViewport)
  --vh-dynamic : 1dvh  /* fallback JS */
  ```
- Utilitaires Tailwind : `pt-safe`, `pb-safe`, `min-h-dvh`, `h-dvh` (remplace les `100vh` qui cassent sur iOS/Chrome Android).
- `<meta name="viewport">` déjà à `viewport-fit=cover` ✅.

## 3. Refactor par composant (mobile)

| Composant | Changement |
|---|---|
| `MobileLayout` | Wrap racine `min-h-dvh`, `pt-safe pb-safe`, gère `--kb-offset` |
| `MobileBottomNav` | Hauteur dynamique, `pb-safe`, masquage si clavier ouvert, hit-area ≥ 44 px |
| `MobileChatView` / `ChatArea` (mobile) | Input collé au-dessus du clavier (`bottom: var(--kb-offset)`), bouton "Aller en bas" repositionné |
| `MobileChannelListView` / `MobileServersView` | Listes utilisent `h-dvh - safe`, scroll inertiel iOS |
| `MobileDMConversation` / `MobileMessageBubble` | Largeur max bulle responsive (`xxs:85% / md:75%`) |
| `MobileChannelDetailSheet`, `MobileMoreActionsSheet`, `MobileDMActionSheet`, `MobileStatusSheet`, `MessagePreviewSheet`, `MobileFriendActionSheet` | Drawer Vaul : `snapPoints` adaptés selon `tier`, padding `pb-safe` |
| `VoicePiP` | Position fixe respectant safe-area + zone interaction Redmagic shoulder triggers |
| `MobileNotificationsView`, `MobileProfileView`, `profile/*` | Header `pt-safe`, grilles `grid-cols-2 xs:grid-cols-1` |
| Modales globales (`Create*`, `GlobalSearch`, `Discover`, `JoinServer`, `account-settings/*`, `server-settings/*`) | Wrappées dans `ResponsiveModal` qui devient fullscreen `Drawer` < `md`, avec safe-area |
| `ChannelList` / `MemberList` (utilisés en sheet mobile) | Touch targets ≥ 44 px, `select-none` déjà en place |
| `VoiceChannelView` (mobile) | Grille recalculée selon orientation, support 120/165 Hz pour animations |
| `ThreadView` mobile | Plein écran avec back natif (swipe) |

## 4. Détails techniques

- **Mise à jour `useIsMobile`** → simple wrapper de `useDevice().isMobile` (rétro-compat).
- **`useBreakpoint`** conservé mais ré-exporte les nouveaux flags ; les anciens (`isMobile`, `isTablet`...) restent stables pour ne rien casser.
- **Foldables** : détection `window.visualViewport.segments` + media query `(horizontal-viewport-segments: 2)`.
- **Dynamic Island / notch** : pas d'API directe, on infère via `env(safe-area-inset-top) >= 50px` → ajoute `safe-top-island` token.
- **Clavier** : `useVisualViewport` existant alimente `--kb-offset` au niveau `<body>` via un petit effet dans `MobileLayout`.
- **Refresh rate haut (Redmagic 165 Hz, ROG 165, iPhone Pro 120)** : flag `refreshRate: 'high'` → active transitions plus longues (les 120 Hz rendent les 150 ms trop courtes).
- **PWA / standalone** : retire le padding top quand pas de chrome navigateur.
- **Tests** : ajout `src/components/mobile/__tests__/useDevice.test.ts` avec mocks `matchMedia`/`visualViewport` couvrant SE1, 12 mini, 14 Pro, 15 Pro Max, Pixel 8 Pro, S24 Ultra, **Redmagic 6**, Z Fold 5 (fermé + ouvert), Xperia 1 V, iPad mini.

## 5. Livrables

1. `src/hooks/useDevice.ts` (+ tests)
2. `src/hooks/useBreakpoint.ts` étendu, `use-mobile.tsx` ré-écrit
3. `tailwind.config.ts` : nouveaux breakpoints + utilitaires safe-area
4. `src/index.css` : variables `--safe-*`, `--kb-offset`, `--vh-dynamic`
5. `src/components/ui/responsive-modal.tsx` : variante mobile-fullscreen safe-area
6. Refactor des 34 composants `mobile/*` + modales globales (liste §3)
7. Matrice de test rendue dans Storybook-like (route `/dev/device-matrix`, visible seulement en dev)

## 6. Hors-scope (à confirmer)

- Pas de changement visuel/design — uniquement adaptation **layout & détection**. Si tu veux aussi revoir le look (couleurs, typographie, motion), c'est un second plan.
- Pas de modif backend / RLS.

Confirme et je passe en build.
