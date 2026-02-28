

# Integrer la carte de profil serveur sur mobile

## Objectif

Ajouter une carte de profil serveur dans `MobileChannelListView` qui s'ouvre quand l'utilisateur tape sur le nom du serveur dans l'en-tete. Cette carte affichera les memes informations que la version desktop : banniere, icone, nom, description, date de creation, fondateur, nombre de membres, emojis et bouton quitter.

## Approche

Plutot que de passer toutes les donnees en props, la carte utilisera directement les hooks existants (`useServers`, `useMembers`, `useServerEmojis`, `useLeaveServer`, `useAuth`) a l'interieur du composant, comme le fait deja le desktop dans `ChannelList.tsx`.

La carte s'affichera dans un **Sheet** (tiroir du bas) adapte au mobile, au lieu d'un Popover comme sur desktop.

## Changements

### Fichier : `src/components/mobile/MobileChannelListView.tsx`

1. **Imports supplementaires** :
   - `Sheet`, `SheetContent`, `SheetTrigger` depuis `@/components/ui/sheet`
   - `Avatar`, `AvatarImage`, `AvatarFallback` depuis `@/components/ui/avatar`
   - `Calendar`, `Users`, `LogOut` depuis `lucide-react`
   - `StreamlineCrown` depuis les icones custom
   - `useServers` depuis `@/hooks/useServers`
   - `useMembers` depuis `@/hooks/useMembers`
   - `useServerEmojis` depuis `@/hooks/useServerAssets`
   - `useAuth` depuis `@/contexts/AuthContext`
   - `useLeaveServer` depuis `@/hooks/useLeaveServer`
   - `AlertDialog` composants pour confirmation quitter

2. **Nouveau composant interne `ServerProfileSheet`** :
   - Prend `serverId`, `serverName` et un `trigger` (le bouton du header) en props
   - Utilise les hooks pour fetcher : serveur complet (banner, icon, description, createdAt, ownerId), membres, emojis
   - Affiche dans un Sheet (tiroir bas) :
     - Banniere (image ou gradient par defaut), avec bouton quitter si non-proprietaire
     - Icone du serveur + nom + description
     - Date de creation avec icone calendrier
     - Fondateur avec icone couronne
     - Nombre de membres avec icone users
     - Grille d'emojis (max 10 + compteur)
   - AlertDialog pour confirmation de depart du serveur

3. **Modification du header embedded et non-embedded** :
   - Envelopper le nom du serveur dans `ServerProfileSheet` pour qu'un tap ouvre le tiroir
   - Ajouter un petit chevron vers le bas a cote du nom pour indiquer que c'est interactif

## Design de la carte (Sheet)

```text
+-------------------------------+
|  [banniere ou gradient]  [X]  |
|         [Quitter]             |
+-------------------------------+
|  [icone]  Nom du serveur      |
|           Description...      |
|                               |
|  📅 Cree le 12 mars 2025     |
|  👑 Fondateur: username       |
|  👥 42 membres                |
|                               |
|  Emojis (5)                   |
|  😀 😎 🎉 🔥 ⭐              |
+-------------------------------+
```

## Fichier modifie

| Fichier | Changement |
|---------|-----------|
| `src/components/mobile/MobileChannelListView.tsx` | Ajouter `ServerProfileSheet` et l'integrer dans le header |

## Resultat attendu

- Taper sur le nom du serveur ouvre un tiroir bas avec toutes les informations du serveur
- Memes donnees que le desktop (banniere, icone, nom, description, date, fondateur, membres, emojis)
- Bouton quitter le serveur (sauf si proprietaire) avec confirmation
- Le tiroir se ferme en glissant vers le bas ou en tapant le fond
