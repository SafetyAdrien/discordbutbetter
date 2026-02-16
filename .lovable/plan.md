

# Icône personnalisée pour les salons

## Objectif

Permettre aux administrateurs d'importer une image personnalisée pour remplacer l'icône par défaut d'un salon (hash, mégaphone, etc.). L'icône custom s'affichera partout où l'icône du salon apparaît (liste des salons, paramètres, etc.).

---

## Modifications requises

### 1. Base de données

Ajouter une colonne `icon_url` (nullable, type `text`) à la table `channels` pour stocker l'URL de l'icône personnalisée.

```sql
ALTER TABLE public.channels ADD COLUMN icon_url text;
```

### 2. Stockage

Créer un bucket `channel-icons` (public) avec les politiques RLS appropriées :
- **SELECT** : tout le monde peut lire (les icônes sont publiques)
- **INSERT** : utilisateurs authentifiés
- **UPDATE/DELETE** : utilisateurs authentifiés (propriétaire du fichier)

### 3. Interface d'upload dans `ChannelOverview.tsx`

Ajouter une zone d'upload d'icône en haut du formulaire d'édition :
- Apercu circulaire de l'icône actuelle (icône par défaut du type ou image custom)
- Bouton "Modifier" au survol pour choisir une image
- Bouton "Supprimer" pour revenir à l'icône par défaut
- Upload vers le bucket `channel-icons` avec un chemin `{channelId}/{uuid}.ext`
- Formats acceptes : PNG, JPG, WEBP, GIF (max 1 Mo)

### 4. Hook `useChannelSettings.ts`

- Ajouter `icon_url` au type `ChannelDetails`
- Ajouter `icon_url` dans la requete SELECT de `useChannelDetails`
- Accepter `icon_url` (ou `null` pour suppression) dans `useUpdateChannel`
- Mettre a jour le cache optimiste pour inclure `icon_url`

### 5. Hook `useChannels.ts`

- Ajouter `icon_url` aux interfaces `ChannelWithCategory` et `OrphanChannel`
- Inclure `icon_url` dans la requete SELECT des salons

### 6. Affichage dans `ChannelList.tsx`

- Modifier le rendu de l'icone du salon : si `channel.icon_url` existe, afficher un `<img>` circulaire (16x16) au lieu du composant SVG par defaut
- Appliquer a tous les endroits ou l'icone est rendue (item de salon, drag overlay)

### 7. Interface `Channel` dans `ChannelList.tsx`

Ajouter `icon_url?: string` a l'interface locale `Channel` (ligne 140).

---

## Flux utilisateur

```text
Parametres du salon > Vue d'ensemble
┌─────────────────────────────────┐
│  ┌──────┐                       │
│  │ ICON │  [Modifier] [Suppr.]  │
│  └──────┘                       │
│                                 │
│  Nom du salon                   │
│  [___________________________]  │
│                                 │
│  Description                    │
│  [___________________________]  │
│                                 │
│              [Enregistrer]      │
└─────────────────────────────────┘
```

---

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| Migration SQL | Ajout colonne `icon_url` + bucket `channel-icons` + politiques RLS |
| `src/hooks/useChannelSettings.ts` | Ajout `icon_url` au type, query et mutation |
| `src/hooks/useChannels.ts` | Ajout `icon_url` aux interfaces et queries |
| `src/components/channel-settings/ChannelOverview.tsx` | Zone d'upload d'icone avec apercu et suppression |
| `src/components/layout/ChannelList.tsx` | Affichage conditionnel image custom vs icone SVG |
| `src/types/app.ts` | Ajout `icon_url?: string` a l'interface `Channel` |

