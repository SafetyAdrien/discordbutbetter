# Unifier l'indicateur d'unread mobile ↔ desktop

## Référence desktop — comportement exact

| Surface | Indicateur "blanc" desktop | Source |
| --- | --- | --- |
| Liste serveurs (`ServerList.tsx`) | Pastille verticale `bg-foreground`, `w-1`, `rounded-r-full` à gauche. Hauteur : `h-10` actif · `h-2` `hasUnread \|\| mentionCount>0` · `h-5` hover · `h-0` sinon. Transition `height 300ms`. | l. 119-130 |
| Liste salons (`ChannelList.tsx`) | Salon non lu : fond `bg-muted/30` (si non actif) + libellé `text-foreground` (sinon `text-[#9B9CA3]`). Mention : pill rouge `bg-destructive`. | l. 688-718 |
| Threads (sous-arbre `ChannelList`) | Aucun indicateur blanc dédié, juste `text-muted-foreground hover:text-foreground`. | l. 471-474 |
| DM (`DMList.tsx`) | Aucun indicateur blanc, uniquement badge rouge `bg-destructive` quand `unreadCount>0`. | l. 207-211 |

Source de vérité des compteurs : `useServerUnreadCounts`, `useChannelUnreadCounts`, `useUnreadCounts` (DM), `useThreadUnreadCounts`.

## État mobile actuel — écarts

1. **`MobileServersView.tsx`** (l. 101-107) — pastille déjà alignée après la passe précédente. OK.
2. **`MobileChannelListView.tsx`** (l. 668-680 et 801-813) — applique `text-foreground` mais **manque le fond `bg-muted/30`** sur les salons non lus non actifs. Pas non plus de pastille mention en cohérence visuelle (juste pill rouge présente).
3. **`MobileChannelListView.tsx`** (threads) — pas de rendu de threads sous les salons sur mobile : à confirmer si requis. Hors scope (alignement, pas nouvelle feature).
4. **`MobileDMListItem.tsx`** (l. 311-380) — déjà aligné desktop (pas de pastille blanche, badge rouge présent, libellé renforcé). Aucun changement nécessaire.
5. **`MobileServersListView.tsx`** (profil) — pastille ajoutée à la passe précédente. OK.

## Plan d'intégration

### 1. `src/components/mobile/MobileChannelListView.tsx`
Aligner le rendu des salons non lus sur desktop :
- Sur les deux boutons salon (l. 658-680 et 791-813), ajouter sur le `className`:
  ```ts
  cn(
    "channel-item w-full",
    activeChannelId === ch.id && "active",
    info?.hasUnread && activeChannelId !== ch.id && "bg-muted/30"
  )
  ```
- Conserver la coloration du libellé `text-foreground` quand non lu (déjà OK).
- Conserver le pill rouge mention (déjà OK).

### 2. `src/components/mobile/MobileServersView.tsx`
Aucun changement (déjà aligné).

### 3. `src/components/mobile/profile/MobileServersListView.tsx`
Aucun changement (déjà aligné).

### 4. `src/components/mobile/dm/MobileDMListItem.tsx`
Aucun changement (desktop n'a pas de pastille blanche DM ; le comportement est déjà identique).

### 5. Threads mobiles
- `MobileThreadView.tsx` et `MobileChannelDetailSheet.tsx` n'affichent pas de liste de threads avec indicateur dédié — desktop non plus. Pas de changement.

## Détails techniques
- Tokens uniquement (`bg-muted/30`, `text-foreground`, `bg-foreground`, `bg-destructive`). Pas de couleur hard-codée.
- Hooks de unread déjà branchés (`useChannelUnreadCounts`, `useServerUnreadCounts`, `useUnreadCounts`). Aucune nouvelle requête, aucun changement backend.
- Vérification finale : `bunx tsc --noEmit` puis preview mobile 360×590.

## Hors scope (à confirmer si souhaité)
- Ajouter un indicateur visuel d'unread sur les threads dans les vues mobiles (le desktop n'en a pas non plus).
- Ajouter une pastille blanche aux DM mobile (le desktop n'en a pas).
