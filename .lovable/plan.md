

# Noms des salons textuels - Option de mise en forme flexible

## Objectif
Ajouter une option dans les parametres du serveur (sous "Profil du serveur") permettant d'activer/desactiver les noms de salons textuels flexibles. Quand active, les salons textuels peuvent avoir des majuscules et des espaces. Quand desactive, seuls les minuscules avec tirets et underscores sont autorises.

## Etapes

### 1. Migration base de donnees
Ajouter une colonne `flexible_channel_names` (boolean, defaut `true`) a la table `server_settings`.

```sql
ALTER TABLE public.server_settings
ADD COLUMN flexible_channel_names boolean DEFAULT true;
```

### 2. Mise a jour du hook `useServerSettings`
- Ajouter `flexible_channel_names` a l'interface `ServerSettings`
- Ajouter la valeur par defaut dans le query fn et l'optimistic update

### 3. Ajouter la section "Noms des salons textuels" dans `ServerProfileSettings`
Sous le bouton "Enregistrer les modifications", ajouter une nouvelle section visuellement separee (comme dans l'image de reference) :
- Titre : **Noms des salons textuels**
- Description : "Configure la mise en forme des noms de salons textuels"
- Un toggle "Autoriser des noms de canal de texte flexibles" avec description explicative
- Le toggle utilise le composant `Switch` existant
- Sauvegarde immediate via `useUpdateServerSettings`

### 4. Appliquer le formatage dans `CreateChannelModal`
- Importer `useServerSettings` pour lire le parametre
- Quand `flexible_channel_names` est desactive et le type est `text` : transformer automatiquement le nom saisi (minuscules, espaces remplaces par des tirets, caracteres speciaux retires)
- Quand active : laisser le nom tel quel

### 5. Appliquer le formatage dans `ChannelOverview` (edition de salon)
- Meme logique de formatage lors de la modification du nom d'un salon existant

## Details techniques

### Fichiers modifies
| Fichier | Modification |
|---------|-------------|
| `server_settings` (migration) | Ajout colonne `flexible_channel_names` |
| `src/hooks/useServerSettings.ts` | Ajout du champ dans l'interface et les defaults |
| `src/components/server-settings/ServerProfileSettings.tsx` | Ajout section toggle en bas |
| `src/components/modals/CreateChannelModal.tsx` | Formatage conditionnel du nom |
| `src/components/channel-settings/ChannelOverview.tsx` | Formatage conditionnel du nom |

### Logique de formatage (quand desactive)
```typescript
function formatChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}
```

