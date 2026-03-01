

# Correction du bouton de fermeture dans le panneau des membres (mobile)

## Probleme

Le composant `SheetContent` (dans `sheet.tsx`) inclut automatiquement un bouton de fermeture (croix) positionne en `absolute right-4 top-4`. Ce bouton se superpose a l'icone "Threads" dans le header du panneau des membres, car les deux occupent le meme emplacement en haut a droite.

## Solution

Deux modifications complementaires :

### 1. Masquer le bouton de fermeture par defaut du Sheet

Dans `MobileChatView.tsx`, ajouter la classe `[&>button.absolute]:hidden` sur le `SheetContent` du panneau des membres. Cela masque le bouton de fermeture auto-genere par le composant Sheet sans modifier le composant partage `sheet.tsx` (qui est utilise ailleurs).

### 2. Ajouter un bouton de fermeture explicite dans le header

Importer `SheetClose` depuis le composant Sheet et l'ajouter a gauche du titre "Membres" (ou a droite apres les icones d'action) pour garder un moyen visible de fermer le panneau sans conflit de position.

## Fichier modifie

- `src/components/mobile/MobileChatView.tsx` : masquer la croix par defaut + ajouter `SheetClose` dans le header du panneau

## Detail technique

```text
Avant :
[Membres]  [Bell] [Pin] [Threads] [X auto-genere qui se superpose]

Apres :
[X SheetClose] [Membres]  [Bell] [Pin] [Threads]
```

Le bouton de fermeture sera place a gauche du titre "Membres" sous forme d'icone, coherent avec le pattern de navigation mobile (retour/fermeture a gauche).

