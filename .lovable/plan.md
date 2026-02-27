

# Apercu en temps reel et recadrage des icones de salon

## Objectif
Ajouter un flux complet : selection de fichier -> recadrage (pour PNG/JPG/WEBP/GIF) ou apercu (pour SVG) -> apercu en temps reel dans le formulaire -> upload uniquement a la sauvegarde. Les PNG seront limites a 1000px max.

## Changements

### 1. `src/components/ui/image-cropper.tsx` - Support PNG et limite 1000px

- Modifier `getCroppedImg` pour accepter un parametre de format (`image/png` ou `image/jpeg`) et une taille max (1000px).
- Si la taille du canvas depasse 1000px, redimensionner proportionnellement avant export.
- Exporter en PNG quand le fichier source est un PNG, sinon en JPEG.

### 2. `src/components/channel-settings/ChannelOverview.tsx` - Refonte du flux d'upload

**Nouveau flux :**
1. L'utilisateur selectionne un fichier.
2. Si c'est un SVG : generer un `URL.createObjectURL` comme apercu local, stocker le fichier pour upload ulterieur.
3. Si c'est une image raster (PNG, JPG, etc.) : ouvrir le composant `ImageCropper` avec l'image. Au retour du crop, stocker le blob recadre et un apercu local via `URL.createObjectURL`.
4. L'apercu s'affiche immediatement dans le cercle d'icone (avant sauvegarde).
5. L'upload vers le bucket `channel-icons` n'a lieu qu'au moment du clic sur "Enregistrer".

**Nouveaux etats :**
- `pendingFile: File | Blob | null` - fichier en attente d'upload
- `previewUrl: string | null` - URL locale pour l'apercu
- `cropperOpen: boolean` - controle du dialog de recadrage
- `cropperSrc: string` - source image pour le cropper

**Modifications cles :**
- `handleIconUpload` ne fait plus d'upload direct. Il valide le fichier, puis ouvre le cropper ou genere l'apercu SVG.
- `handleSave` gere l'upload du `pendingFile` vers le storage avant de mettre a jour le channel.
- Nettoyage des `URL.createObjectURL` via `URL.revokeObjectURL` dans un `useEffect` cleanup.

### 3. Apercu dans le cercle d'icone

L'image affichee dans le cercle utilise `previewUrl` (local, avant save) en priorite, puis `iconUrl` (depuis la base). Cela donne un retour visuel instantane.

## Detail technique

```text
Flux utilisateur :
  [Selection fichier]
        |
   SVG? ----Oui----> Apercu direct (objectURL)
        |
       Non
        |
   [ImageCropper dialog]
        |
   [Blob recadre, max 1000px]
        |
   Apercu local (objectURL)
        |
   [Enregistrer] -> Upload storage -> Update DB
```

## Fichiers modifies
- `src/components/ui/image-cropper.tsx` (ajout format PNG + limite 1000px)
- `src/components/channel-settings/ChannelOverview.tsx` (refonte flux avec cropper + apercu)

