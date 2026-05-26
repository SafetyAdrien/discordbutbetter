

# Parité Desktop/Mobile : système de réponse identique

## Référence Mobile (ce qu'on doit reproduire)

`MobileMessageBubble.tsx` ligne 222-231 et `MobileDMConversation.tsx` ligne 651-680 définissent le standard :
- **RepliedLine** : connecteur en L + mini-avatar 16px + `@auteur` (couleur rôle) + preview tronqué + clic-pour-jump.
- **Bannière de composer** : fond `bg-[hsl(var(--surface-3))]` + barre gauche `border-l-[3px] border-primary` + icône Reply + mini-avatar 5×5 + `@auteur` en couleur primary + preview 64 chars + bouton X.
- **Action "Répondre"** : disponible via `MessagePreviewSheet` au long-press (équivalent du clic-droit Desktop).

## État actuel par surface Desktop

| Surface | RepliedLine | Bannière composer | Action Répondre |
|---|---|---|---|
| `ChatArea.tsx` | ✅ ligne 1534 | ⚠️ `border-l-3` (au lieu de `border-l-[3px]`) ligne 120 | ✅ |
| `DMConversation.tsx` | ⚠️ ligne 436 — pas de `authorColor`/`authorRole` (incohérent) | ✅ ligne 651 | ✅ |
| `ThreadView.tsx` | ⚠️ ligne 809 — `indent={44}` (mobile=28, desktop std=56) | ⚠️ ligne 998 — pas de mini-avatar, structure différente | ✅ |
| `AnnouncementChannel.tsx` | ❓ à vérifier dans le rendu post | ⚠️ ligne 1160 — pas de mini-avatar, pas d'`@auteur` coloré | ✅ |

## Plan de correction

### 1. Extraire un composant partagé `<ReplyBanner>` réutilisable

Créer `src/components/chat/ReplyBanner.tsx` qui reproduit fidèlement le bloc visuel de `MobileDMConversation` ligne 651-680 :
- Props : `authorName`, `authorAvatar`, `authorColor`, `content`, `attachmentsCount`, `onClear`.
- Style : `mx-4 mb-2 flex items-center gap-2 bg-[hsl(var(--surface-3))] rounded-xl px-3 py-2 border-l-[3px] border-primary shadow-sm`.
- Contenu : icône Reply + Avatar 5×5 + `@auteur` coloré + preview tronqué 64 chars + bouton X.

### 2. Remplacer les bannières dans les 4 surfaces Desktop par `<ReplyBanner>`

- `ChatArea.tsx` : remplacer le composant local `ReplyReference` (lignes 105-156) par `<ReplyBanner>`.
- `DMConversation.tsx` : remplacer le bloc inline ligne 651-680 par `<ReplyBanner>`.
- `ThreadView.tsx` : remplacer le bloc inline ligne 998-1015 par `<ReplyBanner>` (corrige l'absence de mini-avatar).
- `AnnouncementChannel.tsx` : remplacer le bloc inline ligne 1160-1176 par `<ReplyBanner>` (ajoute mini-avatar + couleur).

### 3. Harmoniser les paramètres `RepliedLine` au-dessus des messages

- `DMConversation.tsx` ligne 438 : ajouter `authorColor` et `authorRole` (depuis `memberRoles` si disponible — sinon laisser `undefined`, c'est cohérent en DM 1:1).
- `ThreadView.tsx` lignes 824/841 : conserver `indent={44}` (le thread a une jauge plus étroite — c'est intentionnel, validé par `ThreadSpine`). Pas de changement.
- `ChatArea.tsx` : déjà conforme (`indent={56}`, `authorColor`, `authorRole`).

### 4. Confirmer l'action "Répondre" dans le menu contextuel Desktop

`UniversalMessageContextMenu.tsx` ligne 264-267 expose déjà `<ContextMenuItem onClick={onReply}>Répondre</ContextMenuItem>` en tête. Vérifier que les 4 surfaces passent bien `onReply` au composant — `ChatArea` ✅, `ThreadView` ✅, `DMConversation` ✅, `AnnouncementChannel` ✅. Aucun changement requis.

### 5. Validation

- Desktop salon serveur : envoyer une réponse → bannière + RepliedLine identiques au mobile.
- Desktop DM : idem, avec mini-avatar dans la bannière (manquait avant).
- Desktop thread : idem, avec mini-avatar dans la bannière (manquait avant).
- Desktop annonce : idem, avec mini-avatar + couleur auteur (manquaient avant).
- Clic-droit message → "Répondre" en tête du menu sur les 4 surfaces.

## Détails techniques

- Aucune migration BDD. Le pipeline `reply_to_id` + `repliedMessage` est déjà câblé partout.
- Aucun fichier auto-généré modifié.
- Le composant `RepliedLine.tsx` reste inchangé : il est déjà partagé et fait référence.
- Le composant `<ReplyBanner>` centralise le visuel pour éviter toute future divergence Mobile/Desktop.
- Tests existants `RepliedLine.test.tsx` et `UniversalMessageContextMenu.test.tsx` restent valides.

