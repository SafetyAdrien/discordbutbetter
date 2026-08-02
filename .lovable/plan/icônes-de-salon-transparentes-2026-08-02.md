# Icônes de salon transparentes

## Ce qui ne va pas aujourd'hui

Les icônes personnalisées de salon qui ont un fond transparent se retrouvent avec un fond noir une fois appliquées. Cela arrive parce que le pipeline actuel décide de garder la transparence en se basant uniquement sur le type MIME ou l'extension du fichier choisi. Dès que cette détection échoue (image collée, blob recadré, fichier renommé, ré-recadrage d'une icône déjà en ligne), le rendu part en JPEG et l'alpha devient noir. De plus, les icônes déjà enregistrées en `.jpg` dans le stockage restent noires : leur transparence est perdue côté fichier, elles doivent être ré-importées.

## Ce qui va être fait

### 1. Détection fiable de la transparence
- Analyser réellement les pixels du blob recadré (canvas + `getImageData`) pour savoir s'il contient de la transparence, au lieu de se fier au type MIME.
- Si de la transparence est détectée : sortie forcée en **PNG** au recadrage **et** à la compression, upload avec le bon `contentType` et l'extension `.png`.
- Sinon : comportement actuel (WebP/JPEG) inchangé.
- Appliquer la même détection quand on re-recadre une icône déjà en ligne.

### 2. Affichage des icônes
- Passer les icônes de salon en `object-contain` (liste des salons, overlay de glisser-déposer, headers desktop et mobile) pour qu'un logo transparent ne soit ni rogné ni posé sur un aplat.
- Vérifier qu'aucun conteneur parent n'applique de fond opaque derrière l'icône.

### 3. Icônes déjà en ligne
- Les icônes enregistrées avant ce correctif sont aplaties dans le fichier lui-même : afficher un court message dans les paramètres du salon invitant à ré-importer l'image pour retrouver la transparence.

## Détails techniques

- `src/components/channel-settings/ChannelOverview.tsx` : remplacer `sourceMayHaveTransparency(file)` par une détection de pixels alpha sur le blob recadré ; propager le format à `ImageCropper` (`outputFormat`), à `compressImage` (`format`) et à l'upload (`contentType`, extension).
- Nouvel utilitaire `blobHasAlphaPixels(blob)` (canvas hors écran, échantillonnage du canal alpha).
- `src/components/layout/ChannelList.tsx` (lignes ~749 et ~2045), `src/components/chat/ChatArea.tsx` (~1140), `src/components/mobile/MobileChannelHeader.tsx` : `object-cover` → `object-contain`.
