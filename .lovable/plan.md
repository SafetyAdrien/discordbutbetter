

# Centrer verticalement le textarea dans le conteneur MessageInput

## Probleme

Le textarea a un padding vertical asymetrique (`pt-[13px] pb-[11px]`), ce qui decale visuellement le texte vers le bas au lieu de le centrer dans le conteneur.

## Solution

Remplacer le padding asymetrique par un padding symetrique `py-3` (12px en haut et en bas) pour centrer le texte dans le conteneur arrondi.

## Changement

### Fichier : `src/components/chat/MessageInput.tsx` (ligne ~487)

Remplacer :
```
pt-[13px] pb-[11px] text-sm pr-1
```

Par :
```
py-3 text-sm pr-1
```

Il faudra egalement ajuster le padding de l'overlay markdown correspondant dans `InputMarkdownOverlay.tsx` (ligne ~96) pour garder l'alignement entre les deux couches :

Remplacer :
```
pt-[13px] pb-[11px] pr-1
```

Par :
```
py-3 pr-1
```

| Fichier | Changement |
|---------|-----------|
| `src/components/chat/MessageInput.tsx` | Padding textarea symetrique `py-3` |
| `src/components/chat/InputMarkdownOverlay.tsx` | Padding overlay symetrique `py-3` pour rester aligne |

