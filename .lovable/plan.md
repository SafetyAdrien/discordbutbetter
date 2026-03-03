

# Supprimer le "dot" des citations dans l'overlay

## Problème
L'overlay du textarea pour les blockquotes (`>`) utilise un pseudo-élément `::before` (barre verticale de 4px avec `border-radius: 2px`) qui apparaît comme un petit point/dot collé au texte. Le vrai rendu de citation Discord n'a pas cet artefact dans le champ de saisie.

## Correction

### `src/index.css`
Supprimer les styles `.discord-overlay-blockquote` et `.discord-overlay-blockquote::before` (lignes 811-823). La barre décorative crée un artefact visuel non désiré. Le changement de couleur du texte (`text-muted-foreground`) suffit à indiquer visuellement que la ligne est une citation.

### `src/components/chat/InputMarkdownOverlay.tsx`
Retirer la classe `discord-overlay-blockquote` du style de la ligne blockquote (ligne 55), ne garder que `text-muted-foreground`.

