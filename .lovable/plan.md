

# Correction de la liste des membres sur mobile

## Probleme

Le composant `MemberList` utilise des styles desktop fixes (`w-60`, `border-l`, `rounded-tr-xl`) qui ne s'adaptent pas lorsqu'il est affiché dans le `Sheet` mobile de `MobileChatView`. Cela provoque :
- Une largeur fixe de 240px au lieu de remplir le Sheet (288px / `w-72`)
- Une bordure gauche et un arrondi inutiles dans le contexte mobile
- Un positionnement fixe du `UserProfilePopup` (`top: 60, right: 280`) inadapte au mobile

## Modifications

### Fichier : `src/components/layout/MemberList.tsx`

1. **Rendre le conteneur principal adaptatif** : Remplacer les classes fixes par des classes responsives. Sur mobile (dans un Sheet), le composant doit occuper toute la largeur disponible sans bordures superflues.

Remplacer :
```
className="w-60 bg-card flex flex-col border-l border-border/50 rounded-tr-xl"
```
Par :
```
className="w-full sm:w-60 bg-card flex flex-col sm:border-l sm:border-border/50 sm:rounded-tr-xl"
```

2. **Adapter le positionnement du `UserProfilePopup`** : Sur mobile, utiliser le mode `"modal"` au lieu de `"card"` avec un positionnement fixe qui sort de l'ecran.

### Fichier : `src/components/mobile/MobileChatView.tsx`

3. **Ajuster la largeur du Sheet** : Passer de `w-72` a `w-[85vw] max-w-80` pour une meilleure utilisation de l'espace sur mobile tout en restant raisonnable.

## Details techniques

| Aspect | Avant | Apres |
|---|---|---|
| Largeur MemberList | `w-60` (fixe 240px) | `w-full sm:w-60` (adaptatif) |
| Bordure gauche | Toujours presente | `sm:border-l` (desktop uniquement) |
| Arrondi | Toujours present | `sm:rounded-tr-xl` (desktop uniquement) |
| UserProfilePopup mobile | mode `card` avec position fixe | mode `modal` (centre de l'ecran) |
| Sheet mobile | `w-72` | `w-[85vw] max-w-80` |

## Fichiers modifies

- `src/components/layout/MemberList.tsx` — styles adaptatifs + mode popup conditionnel
- `src/components/mobile/MobileChatView.tsx` — largeur du Sheet

