

# Corriger le positionnement du chat input en bas de l'ecran mobile

## Probleme

Le conteneur qui enveloppe `ChatArea` dans `MobileChatView` (ligne 169) est `flex-1 overflow-hidden` mais n'est **pas un conteneur flex**. Or, `ChatArea` utilise `flex-1` pour remplir son parent -- ce qui ne fonctionne que dans un conteneur flex. Resultat : le ChatArea ne remplit pas toute la hauteur disponible et l'input n'est pas colle en bas de l'ecran.

## Correction

### Fichier : `src/components/mobile/MobileChatView.tsx`

**Ligne 169** - Ajouter `flex flex-col` au conteneur wrapper du ChatArea pour que `flex-1` fonctionne correctement a l'interieur :

```
// Avant
<div className="flex-1 overflow-hidden">

// Apres
<div className="flex-1 overflow-hidden flex flex-col">
```

Ce changement unique garantit que le ChatArea remplit 100% de la hauteur disponible, et donc que le `flex-shrink-0` du MessageInput le positionne bien tout en bas de l'ecran.

### Fichier : `src/components/chat/ChatArea.tsx`

**Ligne 773** - Ajouter `min-h-0` au conteneur racine de ChatArea pour eviter que le flex-child deborde :

```
// Avant
className="flex-1 flex flex-col bg-background min-w-0 w-full overflow-x-hidden relative"

// Apres
className="flex-1 flex flex-col bg-background min-w-0 min-h-0 w-full overflow-x-hidden relative"
```

## Resume

| Fichier | Ligne | Changement |
|---------|-------|-----------|
| MobileChatView.tsx | 169 | Ajouter `flex flex-col` au wrapper |
| ChatArea.tsx | 773 | Ajouter `min-h-0` au root |

Deux classes CSS ajoutees, zero risque de regression desktop.
