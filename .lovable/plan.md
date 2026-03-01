

# Intégrer les icônes dans la carte de serveur

## Objectif

Ajouter les icônes **UserPlus** (créer une invitation) et **ChevronDown** (paramètres) **à l'intérieur de la carte de serveur** (le PopoverContent qui s'ouvre en cliquant sur le nom du serveur), tout en conservant leurs positions actuelles dans le header.

## Modification

**Fichier** : `src/components/layout/ChannelList.tsx`

Dans le `PopoverContent` de la carte serveur (lignes ~1211-1295), ajouter une barre d'actions en bas de la carte contenant :

1. **Bouton "Créer une invitation"** (icône `UserPlus`) -- ouvre `setInviteChannelId('server')`
2. **Bouton "Paramètres du serveur"** (icône `ChevronDown` ou `Settings`) -- ouvre `onOpenServerSettings?.()` (visible uniquement si `canAccessSettings`)

Ces boutons seront placés dans une section en bas de la carte, séparés par un `Separator`, sous forme de boutons pleine largeur stylisés comme des items de menu (cohérent avec le style du popover des paramètres existant).

## Detail technique

Ajouter après la section des émojis (ligne ~1293), avant la fermeture du `</div>` principal :

```text
+-- Separator
+-- div (actions bar, px-2 pb-2)
    +-- bouton "Créer une invitation" (UserPlus + texte)
    +-- bouton "Paramètres du serveur" (Settings + texte) [si canAccessSettings]
```

Aucun autre fichier n'est modifié. Les boutons existants dans le header restent intacts.
