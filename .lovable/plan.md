

# Correction : preserver les noms existants lors de l'edition

## Probleme actuel
Dans `ChannelOverview`, quand l'option flexible est desactivee et qu'un utilisateur modifie autre chose que le nom (ex: description), le nom existant est quand meme reformate en minuscules/tirets au moment de la sauvegarde. Cela modifie involontairement les noms de salons existants.

## Solution
Appliquer le formatage strict **uniquement si le nom a ete modifie** par l'utilisateur, pas systematiquement a chaque sauvegarde.

## Modification

**Fichier** : `src/components/channel-settings/ChannelOverview.tsx`

- Modifier la logique de sauvegarde (ligne ~125) pour ne formater le nom que si l'utilisateur l'a effectivement change :

```typescript
// Avant (actuel)
const finalName = shouldFormatStrict ? formatStrictChannelName(name.trim()) : name.trim();

// Apres (corrige)
const nameChanged = name !== channel.name;
const finalName = (shouldFormatStrict && nameChanged) ? formatStrictChannelName(name.trim()) : name.trim();
```

- Modifier l'apercu du formatage (ligne ~196) pour ne s'afficher que si le nom differe de l'original :

```typescript
// Avant
{shouldFormatStrict && name && (

// Apres
{shouldFormatStrict && name && name !== channel.name && (
```

Cela garantit que les salons existants conservent leur nom tel quel, sauf si l'utilisateur decide volontairement de le modifier.

