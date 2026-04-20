

# Audit responsive complet & plan d'amélioration mobile/tablette

## Diagnostic actuel

### Layouts existants
- **Desktop (`≥ 640px`)** : `ServerList(80px) + ChannelList(~240px) + MemberList(~240px) + ChatArea` → **560px de chrome**, le contenu chat tombe à <100px sur tablette portrait.
- **Mobile (`< 640px`)** : `MobileLayout` complet avec `MobileBottomNav`, navigation à pile (`channels → chat → thread`), swipe back, Sheet pour membres.
- **Trou critique [640–1024px]** (téléphones paysage, petites tablettes, iPad portrait à 820px) : utilise le layout **desktop entier** alors qu'aucun panneau n'a de place. ChannelList et MemberList se côtoient et écrasent le chat.

### Points faibles relevés
1. **`useBreakpoint().isMobile` = `< 640px`** uniquement → flag binaire, pas de couche tablette.
2. **`MobileLayout` n'est activé qu'à `< 640px`** → 645px d'écran = expérience desktop cassée.
3. **MemberList toujours ouvert** sur tablette (640–1024) → mange 240px du chat.
4. **Modals** (`CreateServer`, `ServerSettings`, `AccountSettings`, `ChannelSettings`, `GlobalSearch`) : déjà adaptées mobile via `isMobile`, mais leur seuil `< 640px` exclut les tablettes portrait.
5. **`ChatArea` header desktop** (`!isMobile`) reste affiché en tablette → header mobile compact non utilisé.
6. **`MessageInput`** : barre markdown non compactée en tablette → boutons coupés.
7. **`ServerSettingsModal`** : sidebar 240px + contenu ne tient plus < 800px.
8. **DMPage / FriendsPanel / InboxPanel** : pas de version mobile dans le pane principal sous 1024px.
9. **Voice / Stage / Forum / Calendar / Tasks / Media** : header desktop sur tablette, pas de mode plein écran.
10. **Pas de support paysage mobile** (`< 640px` mais `min-height` cassé par claviers virtuels qui réduisent `100dvh`).
11. **Touch targets** : certains boutons à `p-1` ou `w-4 h-4` icons sans zone de tap minimum 44px.
12. **Pas de version `2xl/3xl` à `≥ 1280px`** pour exploiter les grands écrans tablette paysage / iPad Pro.

---

## Stratégie : 4 paliers de breakpoints unifiés

```
xs   < 480px   téléphone portrait        → MobileLayout (pile, bottom nav)
sm   < 768px   téléphone paysage / petite tablette portrait → MobileLayout étendu
md   < 1024px  tablette portrait / iPad → TabletLayout (hybrid, drawer-based)
lg   ≥ 1024px  desktop                  → DesktopLayout (3 panneaux)
xl   ≥ 1440px  desktop large            → DesktopLayout + member list ouvert par défaut
```

**Principe** : `MobileLayout` couvre désormais tout `< 768px`. Un nouveau `TabletLayout` couvre `[768–1024)`. `DesktopLayout` reste tel quel à `≥ 1024px`.

---

## Plan d'amélioration

### Phase 1 — Fondations (breakpoints & layout switch)

1. **Réécrire `useBreakpoint`** :
   - `isXs` < 480px (compact)
   - `isMobile` < 768px (regroupe xs + sm)
   - `isTablet` ≥ 768 et < 1024
   - `isDesktop` ≥ 1024
   - `isLargeDesktop` ≥ 1440
   - Garde compat : `isSmallMobile = isXs`
2. **`Index.tsx`** : `if (isMobile) → <MobileLayout/>`, `else if (isTablet) → <TabletLayout/>`, `else → <DesktopLayout/>` (extrait des lignes 539–752 actuelles).
3. **`useIsMobile` (`use-mobile.tsx`)** : aligner sur 768px pour cohérence avec sidebar shadcn.

### Phase 2 — Couche tablette (`TabletLayout`)

Nouveau composant `src/components/tablet/TabletLayout.tsx` :
- **ServerList** rail compact 64px (au lieu de 80) à gauche, toujours visible.
- **ChannelList** drawer rétractable (Sheet `side="left"`) déclenché par bouton hamburger du header chat. Persisté ouvert par défaut en paysage, fermé en portrait.
- **MemberList** Sheet `side="right"` (déjà utilisé en mobile chat) — bouton dans le header.
- **Chat / Voice / autres canaux** : pleine largeur, header tablette = header mobile (bouton retour transformé en menu hamburger).
- **Threads** : ouverture **pleine largeur** avec bouton retour, jamais de split-view en tablette.

### Phase 3 — `MobileLayout` étendu (xs + sm)

- Étendre l'activation jusqu'à `< 768px`.
- **Bottom nav** : ajouter le tab **« Discuter »** entre Serveurs et Notifs pour accès direct DMs.
- **`MobileChatView` header** : passer en grid responsive — sur `xs` masquer Pin/Threads/Summaries derrière un menu `MoreVertical`, garder seulement Membres + Notifications.
- **`MessageInput`** : 
  - `xs` → barre markdown collapse en bouton « + » avec popover.
  - Boutons à `min-h-11 min-w-11` (44px Apple HIG).
  - Hauteur input min 44px, padding tactile.
- **`100dvh` → `100svh`** sur conteneurs racine (clavier virtuel n'écrase plus le contenu).
- **Safe areas** systématisées : `pb-[env(safe-area-inset-bottom)]` sur bottom nav, `pt-[env(safe-area-inset-top)]` sur headers fixes.

### Phase 4 — Modals & overlays universels

Créer un wrapper `<AdaptiveSheet>` qui rend :
- `< 768px` → `Drawer` plein écran ou bottom-sheet
- `≥ 768 et < 1024` → `Sheet` side
- `≥ 1024` → `Dialog` centré

Migrer :
- `ServerSettingsModal` : déjà mobile-aware → étendre seuil à 768px.
- `AccountSettingsModal` : idem.
- `CreateServerModal`, `JoinServerModal`, `DiscoverModal` : passer en bottom-sheet sur mobile, dialog desktop.
- `ChannelSettingsModal`, `EditCategoryModal` : 2-niveaux mobile déjà OK.
- `GlobalSearchModal` : conserver fullscreen mobile.
- `KeyboardShortcutsModal` : masquer le bouton d'ouverture sur mobile.

### Phase 5 — Canaux spécialisés (mobile/tablette)

- **`VoiceChannelView`** : 
  - Grille participants `grid-cols-1` xs / `grid-cols-2` sm / `grid-cols-3` md.
  - Action bar collée au bas avec safe area.
  - Sidebar membres → Sheet.
  - Chat vocal → Sheet bottom plein écran.
- **`StageChannel`** : podium responsive, audience scroll horizontal sur mobile.
- **`MediaChannel` / `ForumChannel`** : grid `1` colonne xs, `2` sm, `3` md, `4` lg.
- **`CalendarChannel`** : vue agenda liste sur mobile (au lieu de la grille mois).
- **`TasksChannel`** : kanban → tabs (un statut par tab) sur mobile.
- **`AnnouncementChannel`** : déjà standardisé, vérifier le composer mobile.

### Phase 6 — DMs & Friends en mobile

- **`MobileHomeView`** déjà existante — l'enrichir :
  - Onglets internes (Tous / En ligne / En attente / Bloqués) en pills horizontales scrollables.
  - Recherche DM en sticky top.
  - Boutons « Nouvelle conversation » et « Nouveau groupe » FAB en bas à droite (au-dessus du bottom nav).
- **`DMConversation`** mobile : header sticky avec avatar + appel/vidéo accessibles, swipe-back.
- **Inbox** mobile : stack de cartes pleine largeur, swipe-to-dismiss.

### Phase 7 — Composants de chat critiques

- **`ChatArea`** : 
  - Header mobile/tablette = `MobileChatView` actuel, étendu jusqu'à 1024px.
  - `MessageAttachments` : grid adaptive `1 col xs / 2 sm`, lightbox plein écran.
  - `EmojiStickerPicker` : sheet bottom mobile, popover desktop.
  - `MentionAutocomplete` : positionnement `bottom-full` toujours sur mobile (au-dessus du clavier).
- **`PollDisplay`** : actions verticales sur mobile.
- **`UniversalMessageContextMenu`** : remplacé par `MobileMessageActions` bottom sheet via long-press (déjà partiellement implémenté).

### Phase 8 — Profil / paramètres serveur tablette

- `ServerSettingsModal` : 
  - mobile (déjà 2-niveaux) → étendre à `< 1024px`.
  - tablette : sidebar 200px + contenu dans flex-1.
- `AccountSettingsModal` : même pattern.
- `MemberManager`, `RoleManager`, `InviteManager`, `BannedMembersManager`, `AuditLogManager` : tableaux → cards verticales sur mobile, table scroll-x sur tablette.
- `RoleEditor` : stepper plein écran mobile.

### Phase 9 — Touch & accessibilité

- Globalement augmenter zones tactiles : tous les `<button>` de moins de 32×32 → wrapper `min-w-11 min-h-11`.
- Long-press systématique sur messages / membres / serveurs → `useLongPress` (déjà existant).
- Swipe gestures cohérents : 
  - droite → back partout (déjà via `useSwipeBack`)
  - gauche sur message → actions rapides
  - bas-haut sur DM → archiver (à ajouter).
- `tap-highlight-color: transparent` global, `user-select: none` sur listes, déjà partiellement présent.

### Phase 10 — Performance mobile

- `prefers-reduced-motion` honoré sur toutes les animations Framer Motion.
- `IntersectionObserver` pour lazy-load les avatars membres dans MemberList.
- Réduire bundle initial mobile : code-splitter `MobileLayout` séparément, lazy-load `DesktopLayout`.
- Service worker / PWA install prompt déjà partiellement présent (`pages/Install.tsx`) → lier depuis profil mobile.

---

## Fichiers impactés (synthèse)

**Nouveaux** :
- `src/components/tablet/TabletLayout.tsx`
- `src/components/ui/adaptive-sheet.tsx` (wrapper)
- `src/components/mobile/MobileMoreActionsSheet.tsx` (menu kebab header)

**Modifiés (majeur)** :
- `src/hooks/useBreakpoint.ts` (4 paliers)
- `src/hooks/use-mobile.tsx` (768px)
- `src/pages/Index.tsx` (3-way switch + extraire `DesktopLayout`)
- `src/components/mobile/MobileLayout.tsx` (étendu jusqu'à 768px, bottom nav 4 tabs)
- `src/components/mobile/MobileBottomNav.tsx` (ajouter tab Discuter)
- `src/components/mobile/MobileChatView.tsx` (header overflow menu, 100svh)
- `src/components/chat/ChatArea.tsx` (header masqué jusqu'à 1024)
- `src/components/chat/MessageInput.tsx` (touch targets, markdown bar collapse)
- `src/components/server-settings/ServerSettingsModal.tsx` (seuil 1024)
- `src/components/account-settings/AccountSettingsModal.tsx` (idem)
- Tous les modals dans `src/components/modals/*` (migration AdaptiveSheet)
- Tous les canaux spécialisés (`VoiceChannelView`, `StageChannel`, `MediaChannel`, `ForumChannel`, `TasksChannel`, `CalendarChannel`)

**Modifiés (mineur)** :
- `src/index.css` : ajout utilitaires `.touch-target`, `.svh-screen`, safe-area helpers
- `tailwind.config.ts` : screens étendus (`xs: 480, sm: 640, md: 768, lg: 1024, xl: 1280, 2xl: 1440`)

---

## Livraison itérative recommandée

| Lot | Contenu | Impact visuel | Risque |
|-----|---------|---------------|--------|
| **1** | Phases 1 + 2 (breakpoints + TabletLayout) | Énorme — corrige le trou 640-1024px | Moyen |
| **2** | Phase 3 (MobileLayout étendu + bottom nav 4 tabs) | Grand | Faible |
| **3** | Phase 4 (AdaptiveSheet + modals) | Moyen | Faible |
| **4** | Phases 5 + 6 (canaux spécialisés + DMs) | Grand | Moyen |
| **5** | Phases 7 + 8 (chat polish + settings) | Moyen | Faible |
| **6** | Phases 9 + 10 (touch + perf) | Subtil mais critique UX | Faible |

Chaque lot est indépendant et testable isolément. Aucun changement de DB, aucune migration backend, purement UI/layout.

---

## Garanties de non-régression

- Aucune modification du wire format messages, mentions, snowflakes
- Aucun changement de RLS / permissions
- Layout desktop ≥ 1024px **strictement préservé** (il est extrait sans modification dans Phase 1)
- Hooks de données (`useChannels`, `useMessages`, `useMembers`, etc.) inchangés
- Realtime / cache architecture inchangés

