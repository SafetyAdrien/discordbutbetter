

# Correctifs : Icone personnalisee et duplication

## Probleme 1 : L'icone ne se met pas a jour dans la sidebar apres sauvegarde

Dans `src/hooks/useChannelSettings.ts`, la mise a jour optimiste du cache `channels` et `servers` omet `icon_url`. Seuls `name`, `description` et `type` sont propages.

**Ligne 87** : `{ ...ch, name, description: ..., type: ... }` -- manque `icon_url`
**Ligne 109** : `{ ...ch, name, type: ... }` -- manque `icon_url`

### Correction (useChannelSettings.ts)

- Ligne 87 : ajouter `icon_url: icon_url !== undefined ? icon_url : ch.icon_url` dans le spread du `updateChannel`
- Ligne 109 : ajouter `icon_url: icon_url !== undefined ? icon_url : ch.icon_url` dans le spread du cache `servers`

## Probleme 2 : La condition d'envoi de icon_url est trop stricte

Dans `src/components/channel-settings/ChannelOverview.tsx`, ligne 119 :
```
icon_url: iconUrl !== (channel.icon_url || null) ? iconUrl : undefined
```

Quand `icon_url` vaut `undefined`, le hook `useUpdateChannel` ignore la mise a jour (`if (icon_url !== undefined)`). C'est correct en theorie, mais si l'icone n'a pas change, on ne veut pas l'envoyer. Le probleme est que cette logique fonctionne -- le vrai bug est dans le cache optimiste (probleme 1).

## Fichier a modifier

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useChannelSettings.ts` | Ajouter `icon_url` dans les mises a jour optimistes du cache `channels` (ligne 87) et `servers` (ligne 109) |

## Detail technique

### Cache `channels` (ligne 85-88)
Avant :
```typescript
const updateChannel = (ch: any) =>
  ch.id === channelId
    ? { ...ch, name, description: description ?? ch.description, type: type ?? ch.type }
    : ch;
```

Apres :
```typescript
const updateChannel = (ch: any) =>
  ch.id === channelId
    ? { ...ch, name, description: description ?? ch.description, type: type ?? ch.type, icon_url: icon_url !== undefined ? icon_url : ch.icon_url }
    : ch;
```

### Cache `servers` (ligne 109)
Avant :
```typescript
ch.id === channelId ? { ...ch, name, type: type ?? ch.type } : ch
```

Apres :
```typescript
ch.id === channelId ? { ...ch, name, type: type ?? ch.type, icon_url: icon_url !== undefined ? icon_url : ch.icon_url } : ch
```

