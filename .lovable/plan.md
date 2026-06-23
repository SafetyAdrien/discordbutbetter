## Objectif

Quand on ouvre la **carte de profil** (`UserProfilePopup`) ou le **modal profil complet** (`FullUserProfileModal`) — que ce soit le sien ou celui d'un autre utilisateur — afficher :

- Le statut actuel (Online / Idle / Ne pas déranger / Offline) en libellé clair, à jour en temps réel.
- Une ligne "Dernière activité" :
  - **Affiché** : format relatif type Discord (« actif maintenant », « il y a 2 min », « il y a 1 h », « hier à 14:32 »).
  - **Au survol (tooltip)** : la date/heure absolue complète (ex. « lundi 23 juin 2026 à 14:32 »).

## Fonctionnement

- Les champs `last_seen_at` et `last_activity_at` existent déjà sur `profiles` et sont rafraîchis par le heartbeat.
- Quand le statut est `online` → on affiche « Actif maintenant » (vert).
- Quand `idle` → « Inactif depuis {relatif} », calculé sur `last_activity_at`.
- Quand `offline` → « Vu pour la dernière fois {relatif} », calculé sur `last_seen_at`.
- Quand `dnd` → « Ne pas déranger » (pas de timestamp affiché, par respect de l'intention utilisateur).

Le libellé relatif se met à jour automatiquement toutes les 30 s tant que le popup est ouvert (petit `useEffect` + `setInterval`), et les nouveaux timestamps arrivent en push via la souscription Realtime déjà en place sur `profiles`.

## Détails techniques

### 1. Exposer les nouveaux champs côté client

- `useProfile` / les hooks de profil tirent déjà `*` depuis `profiles`, donc `last_seen_at` et `last_activity_at` sont automatiquement disponibles.
- Étendre le type local `User`/`Profile` utilisé dans `UserProfilePopup.tsx` et `FullUserProfileModal.tsx` pour inclure `last_seen_at?: string | null` et `last_activity_at?: string | null`.
- Les passer depuis les call-sites qui construisent l'objet `user` envoyé au popup (membres, friends, DMs, etc.) — fallback `null` quand l'info n'est pas chargée.

### 2. Nouveau composant `PresenceActivityLine`

Fichier : `src/components/profile/PresenceActivityLine.tsx`

Props : `{ status, lastSeenAt, lastActivityAt }`.

Logique :

```text
online → "Actif maintenant"             tooltip: now
idle   → "Inactif depuis " + relTime(last_activity_at)   tooltip: absolu
dnd    → "Ne pas déranger"              tooltip: absent
offline→ "Vu " + relTime(last_seen_at)  tooltip: absolu
```

- Utilise `date-fns` (déjà dans le projet) : `formatDistanceToNowStrict(date, { locale: fr, addSuffix: true })` pour le relatif et `format(date, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })` pour l'absolu.
- Wrappe le texte dans le `Tooltip` shadcn pour l'horodatage absolu au survol.
- Re-render toutes les 30 s via `useEffect` + `setInterval` quand le composant est monté.

### 3. Intégration UI

- **`UserProfilePopup.tsx`** : juste sous le `StatusIndicator` ligne ~458, ajouter `<PresenceActivityLine ... />` dans la zone d'identité (sous le pseudo, au-dessus de la bio).
- **`FullUserProfileModal.tsx`** : sous l'indicateur de statut ligne ~155, dans le bandeau d'en-tête du modal.

Aucun changement de couleurs/typo : on réutilise les tokens existants (`text-muted-foreground` pour le timestamp, `text-status-online/idle/dnd/offline` quand pertinent).

### 4. Realtime

La souscription Realtime sur `profiles` est déjà gérée par `useProfilesRealtime` / cache global → les changements de `last_seen_at`, `last_activity_at` et `status` propagent automatiquement les nouveaux props vers les composants ouverts. Rien à ajouter côté DB ni côté abonnement.

## Hors-scope

- Pas de modification du heartbeat ni des fonctions SQL (déjà en place).
- Pas d'ajout de l'info dans la liste des membres / DMs (uniquement dans la carte profil et le modal profil, comme demandé).
