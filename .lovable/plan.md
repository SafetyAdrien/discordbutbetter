# Refonte UI/UX — Notifications Mobile

## Objectifs

1. **Nettoyer le header** : retirer les tabs visibles (Tout / Mentions / Réponses / Système) et les regrouper dans une popup de filtres accessible via un icône.
2. **Élargir le scope** : intégrer aussi les notifications de **Messages Privés** (amis favoris + DMs les plus actifs).
3. **Tri intelligent** : organiser la liste par activité récente avec regroupement par catégorie collapsible.
4. **Filtre par serveur** : permettre de filtrer les notifications par serveur spécifique depuis la popup.

---

## 1. Nouveau Header

```text
┌────────────────────────────────────────┐
│ ← Notifications  •3       [⚙ Filtres] │
├────────────────────────────────────────┤
│ [Pills actifs (si filtre appliqué) ×] │
└────────────────────────────────────────┘
```

- Retrait des pills de filtres permanents.
- Nouveau bouton **icône Filtre** (`SlidersHorizontal`) à droite, avec un dot primary si un filtre est actif.
- Si un filtre est actif → affichage d'un **chip retirable** sous le header (ex: « Serveur : Mon Serveur ×», « Mentions ×»).
- Compteur unread déplacé à côté du titre de manière plus discrète.

## 2. Popup de Filtres (Sheet bottom)

Sheet glissant depuis le bas (`Sheet` de shadcn en `side="bottom"`), avec sections :

- **Type** : chips multi-sélection — Tout, Mentions, Réponses, Système, **Messages privés** (nouveau).
- **Source** : sélecteur de serveur (liste scrollable avec icônes) + option « Messages privés ».
- **Période** : Aujourd'hui / 7 jours / 30 jours / Tout.
- Boutons en bas : « Réinitialiser » + « Appliquer ».

## 3. Intégration des Messages Privés

Nouveau hook `useDMNotifications()` qui agrège :

- **DM non-lus** depuis `dm_read_states` + `dm_messages` (dernier message > last_read_at).
- **Bonus de priorité** pour :
  - Amis marqués favoris (`friend_favorites`)
  - Conversations très actives (nombre de messages reçus dans les dernières 24h)
- Mappés vers une structure unifiée `UnifiedNotification` (compatible avec `ServerNotification` + nouveau type `dm_message`).

## 4. Tri & Regroupement

Liste regroupée par sections collapsibles avec headers :

- **Aujourd'hui**
- **Cette semaine**
- **Plus ancien**

Dans chaque section, tri par `created_at` desc. Les DMs de favoris et notifications mentions sont surlignées avec un liseré primary à gauche.

## 5. Améliorations UX

- **Animation fluide** au passage du filtre (motion fade + slide).
- **Empty states contextuels** par filtre actif.
- **Swipe gauche/droite conservé** (mark read / archive), avec icônes plus claires.
- **Header sticky** au scroll.
- **FAB « Tout marquer lu »** : conservé, repositionné.

---

## Section technique

### Fichiers à créer

- `src/hooks/useUnifiedNotifications.ts` — agrège `useNotifications` + nouveau `useDMNotifications`, retourne `UnifiedNotification[]`.
- `src/hooks/useDMNotifications.ts` — query DMs non-lus avec scoring (favoris + activité).
- `src/components/mobile/notifications/NotificationsFilterSheet.tsx` — Sheet shadcn bottom avec filtres multi-critères.
- `src/components/mobile/notifications/NotificationSection.tsx` — section collapsible par période.
- `src/components/mobile/notifications/UnifiedNotificationRow.tsx` — row swipeable supportant DM + serveur.

### Fichiers modifiés

- `src/components/mobile/MobileNotificationsView.tsx` :
  - Suppression des pills permanents.
  - Ajout du bouton filtre dans le header (icône `SlidersHorizontal`).
  - State `filters: { types: Set<string>; serverId: string|null; period: 'today'|'week'|'month'|'all' }`.
  - Utilise `useUnifiedNotifications` et `NotificationsFilterSheet`.
  - Affichage de chips de filtres actifs sous le header.
  - Regroupement par période via `NotificationSection`.

### Schéma de données (lecture seule, pas de migration)

- `dm_messages` (sender_id, dm_conversation_id, created_at, content)
- `dm_read_states` (user_id, dm_conversation_id, last_read_at)
- `dm_participants` (user_id, dm_conversation_id) — pour résoudre l'autre participant
- `friend_favorites` (user_id, friend_id)
- `server_notifications` (existant)

### Performance

- Scoring DM calculé côté client (cache déjà chaud via realtime DM).
- Pas de nouvelle subscription : réutilise les channels existants (DM + notifications).
- Memoization du tri/regroupement avec `useMemo` sur les dépendances clés.

### Compat

- L'icône Bell dans `MobileProfileView` reste inchangée.
- Aucune modification du schéma DB, aucune migration.
