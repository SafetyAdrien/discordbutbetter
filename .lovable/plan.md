
# Correction du "Fondateur: Inconnu" dans la Carte Serveur

## Problème identifié

Dans `ChannelList.tsx`, la recherche du propriétaire du serveur compare un **mauvais champ** :

```typescript
// Ligne 762 - ACTUEL (BUGUÉ)
const ownerProfile = membersData?.find((m) => m.id === server.ownerId);
```

- `m.id` = ID de la ligne dans `server_members` (clé primaire de la table de liaison)
- `server.ownerId` = UUID de l'utilisateur (provient de `servers.owner_id`)

Ces deux valeurs ne correspondent **jamais** car elles représentent des entités différentes.

---

## Solution

Comparer le bon champ : `m.user.id` (l'UUID de l'utilisateur) au lieu de `m.id` (l'ID de membership).

---

## Modification

### Fichier : `src/components/layout/ChannelList.tsx`

**Ligne 762** - Corriger la recherche du propriétaire :

```typescript
// AVANT (bugué)
const ownerProfile = membersData?.find((m) => m.id === server.ownerId);

// APRÈS (corrigé)
const ownerProfile = membersData?.find((m) => m.user.id === server.ownerId);
```

---

## Analyse technique

| Élément | Valeur actuelle | Type |
|---------|-----------------|------|
| `m.id` | ID de `server_members` | UUID de la ligne membership |
| `m.user.id` | ID de `profiles` | UUID de l'utilisateur |
| `server.ownerId` | `servers.owner_id` | UUID de l'utilisateur |

La comparaison doit être : `m.user.id === server.ownerId` pour trouver le membre dont le profil utilisateur correspond au propriétaire du serveur.

---

## Structure des données

```text
server_members           profiles                 servers
┌──────────────┐        ┌──────────────┐         ┌──────────────┐
│ id (PK)      │        │ id (PK)      │◄────────│ owner_id     │
│ user_id (FK) │───────►│ display_name │         │ name         │
│ server_id    │        │ username     │         └──────────────┘
└──────────────┘        └──────────────┘

useMembers retourne:
{
  id: server_members.id,        ← NE PAS utiliser pour comparer avec owner_id
  user: {
    id: profiles.id,            ← UTILISER pour comparer avec owner_id
    display_name: "...",
    ...
  }
}
```

---

## Résultat attendu

| Avant | Après |
|-------|-------|
| Fondateur: Inconnu | Fondateur: NomDuPropriétaire |

---

## Fichier à modifier

| Fichier | Ligne | Modification |
|---------|-------|--------------|
| `src/components/layout/ChannelList.tsx` | 762 | `m.id` → `m.user.id` |
