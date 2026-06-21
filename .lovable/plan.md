# Indicateur blanc de la liste de serveurs — Mobile

## Analyse Desktop (`src/components/layout/ServerList.tsx`, lignes 119-130)

L'indicateur blanc est une **pastille verticale** positionnée à gauche de chaque icône de serveur :

- Couleur : `bg-foreground` (blanc dans le thème sombre)
- Largeur : `4px` (`w-[4px]`)
- Position : `absolute -left-[14px]`, centrée verticalement
- Forme : `rounded-r-full` (pilule arrondie à droite uniquement)
- Transition : `height 300ms`

États (hauteur dynamique) :
- **Actif** : `h-10` (grande pilule)
- **Non lu OU mention** (`hasUnread || mentionCount > 0`) : `h-2` (petit point)
- **Hover (group-hover)** : `h-5`
- **Par défaut** : `h-0` (invisible)

Source des données : `useServerUnreadCounts()` → `unreadInfo[serverId] = { hasUnread, mentionCount }`.

## État actuel sur Mobile (`src/components/mobile/MobileServersView.tsx`, lignes 101-104)

Une pastille existe déjà mais diffère du desktop :
- Largeur `w-1` (≈ 4px) — proche du desktop
- Position `-left-[11px]` — décalage légèrement différent
- États : actif `h-8`, `hasUnread` `h-3`, sinon `h-0 opacity-0`
- **Ne réagit PAS à `mentionCount`** (pilule absente s'il y a une mention mais pas d'unread)
- Pas de transition `height` explicite (utilise `transition-all`)
- Pas de `rounded-r-full` strict (utilise `rounded-r-full` OK)

La liste secondaire `src/components/mobile/profile/MobileServersListView.tsx` n'affiche aucun indicateur d'unread.

## Plan d'intégration

### 1. `src/components/mobile/MobileServersView.tsx`
Aligner la pastille sur le comportement desktop :
- Condition de visibilité : `isActive ? 'h-8' : (hasUnread || mentionCount > 0) ? 'h-2' : 'h-0 opacity-0'`
- Conserver `w-1`, `bg-foreground`, `rounded-r-full`
- Ajouter `style={{ transition: 'height 300ms' }}` pour cohérence visuelle desktop
- Garder `-left-[11px]` (adapté au padding mobile)

### 2. `src/components/mobile/profile/MobileServersListView.tsx`
Ajouter le même indicateur sur la liste de serveurs du profil mobile :
- Importer `useServerUnreadCounts`
- Récupérer `unreadInfo[server.id]` pour chaque serveur listé
- Rendre la pastille verticale `bg-foreground` à gauche de chaque ligne, mêmes règles d'état que MobileServersView
- Adapter le positionnement absolu au layout en ligne (probablement `-left-1` avec un parent `relative`)

### 3. Aucune modification backend / hooks
`useServerUnreadCounts` fournit déjà `hasUnread` et `mentionCount` — aucune nouvelle requête ni table.

## Détails techniques

- Tokens : utilise `bg-foreground` (sémantique, respecte le thème) — pas de couleur hard-codée.
- Aucune logique métier modifiée, uniquement présentation.
- Pas de changement sur le badge rouge de mention (déjà aligné desktop/mobile).
- Vérification finale : `bunx tsc --noEmit` puis preview mobile (360×590) pour valider rendu.
