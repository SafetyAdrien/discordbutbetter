

# Icônes de type de salon dans les paramètres + Tooltips manquants

## Problème 1 : Icône de type manquante dans les paramètres

Dans `ChannelOverview.tsx`, le cercle avec l'icône du type de salon (hashtag, micro, forum, etc.) n'apparaît que pour les salons `text` et `announcement` (via `canHaveCustomIcon`). Pour les autres types (voice, forum, media, calendar, tasks), aucune icône de type n'est affichée à côté du nom du salon dans les paramètres.

**Solution** : Toujours afficher l'icône du type de salon à côté du nom, pour tous les types. Seul le comportement de clic (upload d'image) reste limité aux types `text`/`announcement`. Les autres types affichent simplement leur icône sans interaction.

### Changements dans `ChannelOverview.tsx`
- Ajouter `stage` et `link` dans `channelTypeLabels`
- Utiliser `channel.type` directement (pas `channelType` qui est limité à text/announcement) pour résoudre l'icône affichée
- Toujours rendre le cercle d'icône, mais sans `cursor-pointer` ni `onClick` pour les types non-éligibles à l'upload

## Problème 2 : Tooltips manquants

Plusieurs icônes interactives dans `ChannelList.tsx` n'ont pas de tooltip au hover :

**Dans la sidebar des salons (hover actions, lignes 700-726)** :
- `MessageSquare` (ouvrir le chat vocal) — pas de tooltip
- `UserPlus` (créer une invitation) — pas de tooltip
- `Settings` (paramètres du salon) — pas de tooltip

**Dans le header du serveur (ligne 1508-1518)** :
- `Settings` (paramètres du serveur) — pas de tooltip

**Sur les icônes de type des salons dans la liste** :
- L'icône du type (hashtag, micro, etc.) n'a pas de tooltip indiquant le type du salon

### Changements dans `ChannelList.tsx`
- Wrapper chaque icône d'action hover avec `<Tooltip>/<TooltipTrigger>/<TooltipContent>`
- Labels : "Ouvrir le chat" (MessageSquare), "Créer une invitation" (UserPlus), "Modifier le salon" (Settings)
- Header serveur Settings : "Paramètres du serveur"
- Icône de type dans la liste : tooltip avec le nom du type ("Salon textuel", "Salon vocal", "Forum", "Annonces", "Médias", "Calendrier", "Tâches", "Scène", "Lien")

## Fichiers modifiés
- `src/components/channel-settings/ChannelOverview.tsx`
- `src/components/layout/ChannelList.tsx`

