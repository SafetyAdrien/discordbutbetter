

# Affichage du nom du serveur sur la banniere avec ombre

## Objectif

Superposer le nom du serveur en bas de la banniere avec un effet d'ombre (gradient sombre), sur mobile (ServerProfileSheet) et desktop (PopoverContent dans ChannelList). Le sheet mobile doit se fermer instantanement au swipe vers le bas (pas d'animation de sortie sur la banniere).

## Changements

### 1. Mobile - `src/components/mobile/MobileChannelListView.tsx`

**Banniere du ServerProfileSheet (lignes 122-171)** :
- Ajouter un gradient sombre (`bg-gradient-to-t from-black/70 to-transparent`) en overlay absolu en bas de la banniere
- Placer le nom du serveur (`serverName`) en position absolue `bottom-2 left-3`, en blanc, avec `text-shadow` pour la lisibilite
- Le nom sera tronque (`truncate`) et en `font-bold text-sm`

**Fermeture instantanee** :
- Ajouter la classe CSS pour desactiver l'animation de fermeture du `SheetContent` : ajouter `data-[state=closed]:duration-0` ou utiliser la prop de transition du Sheet pour que la banniere disparaisse sans delai au swipe vers le bas

### 2. Desktop - `src/components/layout/ChannelList.tsx`

**Banniere du PopoverContent (lignes 1182-1206)** :
- Meme traitement : ajouter un overlay gradient sombre en bas de la banniere
- Afficher le nom du serveur en bas a gauche de la banniere avec ombre portee
- Le nom sera en `font-bold text-sm text-white` avec `drop-shadow`

### Detail technique

Le gradient overlay et le texte seront positionnes en `absolute` dans le conteneur `relative` de la banniere existant. Aucun changement structurel, seulement des ajouts visuels.

```text
+---------------------------+
|                           |
|        (banniere)         |
|  gradient sombre -------> |
|  Nom du serveur           |
+---------------------------+
```

### Fichiers modifies

| Fichier | Modification |
|---|---|
| `MobileChannelListView.tsx` | Overlay gradient + nom sur banniere, fermeture instantanee |
| `ChannelList.tsx` | Overlay gradient + nom sur banniere desktop |

