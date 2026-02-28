

# Afficher le Proprietaire Secondaire dans la carte de profil serveur (Mobile)

## Objectif

Quand un proprietaire secondaire est defini sur le serveur, afficher son nom dans la section metadata de la carte de profil, juste apres le fondateur. Les donnees sont deja disponibles en temps reel via `useServers` (qui contient `secondary_owner_id`) et `useMembers` (qui contient les profils).

## Changement

### Fichier : `src/components/mobile/MobileChannelListView.tsx`

1. **Ajouter une variable `secondaryOwnerMember`** derivee de `members` et `server.secondary_owner_id` (meme pattern que `ownerMember`)

2. **Ajouter un bloc conditionnel** dans la section metadata, apres le fondateur, affichant :
   - Icone couronne (couleur argentee pour differencier du fondateur dore)
   - Texte : "Co-proprietaire : **nom**"
   - Visible uniquement si `server.secondary_owner_id` est defini et le membre est trouve

Le rendu sera en temps reel car `useServers` est deja abonne aux changements Realtime sur la table `servers` (incluant `secondary_owner_id`).

## Code prevu

```tsx
// Ligne ~90, apres ownerMember
const secondaryOwnerMember = members?.find((m) => m.user.id === server?.secondary_owner_id);

// Ligne ~189, apres le bloc ownerMember
{secondaryOwnerMember && (
  <div className="flex items-center gap-2.5 text-muted-foreground">
    <StreamlineCrown className="w-4 h-4 flex-shrink-0 text-gray-400" size={16} />
    <span className="text-xs">
      Co-proprietaire : <span className="text-foreground font-medium">
        {secondaryOwnerMember.user.display_name}
      </span>
    </span>
  </div>
)}
```

## Fichier modifie

| Fichier | Changement |
|---------|-----------|
| `src/components/mobile/MobileChannelListView.tsx` | Ajouter l'affichage du proprietaire secondaire dans la carte de profil |

