

# Propagation des icones personnalisees des salons

## Probleme
Quand un utilisateur change l'icone d'un salon dans les parametres, le changement est bien sauvegarde en base et le cache optimiste met a jour les donnees, mais l'icone n'apparait pas dans la liste des salons. La raison : dans `Index.tsx`, lors de la transformation des donnees serveur pour le composant `ChannelList`, la propriete `icon_url` n'est pas incluse dans le mapping des channels.

## Changement

### `src/pages/Index.tsx` - Ajouter `icon_url` au mapping des channels

Deux endroits a corriger :

1. **`serverForChannelList`** (ligne ~330) : ajouter `icon_url: ch.icon_url || undefined` dans le mapping des channels pour que `ChannelList` recoive l'icone personnalisee.

2. **`serverListData`** (ligne ~310) : meme ajout pour que `ServerList` dispose aussi de l'information si necessaire.

C'est un changement de 2 lignes au total. Le reste de la chaine (stockage, cache optimiste, affichage dans `ChannelList`) fonctionne deja correctement.
