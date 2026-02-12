

# Afficher le username du fondateur en minuscules

## Modification

### Fichier : `src/components/layout/ChannelList.tsx`

**Ligne 1238** - Ajouter `.toLowerCase()` sur le username :

```typescript
// AVANT
<span>Fondateur: {ownerProfile?.user?.username || "Inconnu"}</span>

// APRÈS
<span>Fondateur: {ownerProfile?.user?.username?.toLowerCase() || "Inconnu"}</span>
```

## Résultat attendu

| Avant | Après |
|-------|-------|
| Fondateur: Adrien_Sama | Fondateur: adrien_sama |

## Fichier a modifier

| Fichier | Ligne | Modification |
|---------|-------|--------------|
| `src/components/layout/ChannelList.tsx` | 1238 | Ajout de `.toLowerCase()` |

