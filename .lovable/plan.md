**Problème** : Dans `InputMarkdownOverlay.tsx` (ligne 303), la regex inline code `` `(.+?)` `` matche le backtick du milieu lorsque l'utilisateur tape `` ``` ``, ce qui produit la petite pastille colorée (fond `bg-muted/40`, texte rose) visible sur la capture.

**Correction** : Modifier le groupe inline code de la regex pour interdire les backticks à l'intérieur du contenu, soit `` `([^\`\n]+?)` ``. Cela empêche `` ``` `` (et toute séquence de backticks consécutifs) d'être interprété comme du code en ligne, tout en laissant `` `foo` `` fonctionner normalement.

Aucun autre changement.