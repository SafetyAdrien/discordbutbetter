
# Utiliser le Username du Fondateur au lieu du Nom d'Affichage

## Problème

La carte serveur affiche actuellement le **nom d'affichage** (`display_name`) du fondateur, mais l'utilisateur souhaite voir le **username** à la place.

---

## Modification

### Fichier : `src/components/layout/ChannelList.tsx`

**Ligne 1238** - Remplacer `display_name` par `username` :

```typescript
// AVANT
<span>Fondateur: {ownerProfile?.user?.display_name || "Inconnu"}</span>

// APRÈS
<span>Fondateur: {ownerProfile?.user?.username || "Inconnu"}</span>
```

---

## Résultat attendu

| Avant | Après |
|-------|-------|
| Fondateur: MonNomAffiché | Fondateur: monusername |

---

## Fichier à modifier

| Fichier | Ligne | Modification |
|---------|-------|--------------|
| `src/components/layout/ChannelList.tsx` | 1238 | `display_name` → `username` |
