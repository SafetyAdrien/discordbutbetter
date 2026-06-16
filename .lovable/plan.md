
## Problème

Sur la modale "Recadrer l'image" (utilisée pour la photo de profil utilisateur ET pour l'icône de serveur), la zone de recadrage est coupée :
- Le conteneur de prévisualisation utilise `max-h-[400px] overflow-hidden`, ce qui clippe le cercle de sélection en haut/bas.
- Le zoom est appliqué via `transform: scale(...)` sur le `<img>` : l'image grandit visuellement mais déborde du conteneur (qui la rogne), et la sélection de `react-image-crop` n'est plus alignée avec ce qu'on voit.
- La largeur du Dialog (`max-w-lg`) est trop étroite pour une image carrée à pleine hauteur.

## Correctif (fichier unique : `src/components/ui/image-cropper.tsx`)

1. **Élargir et reformater la modale**
   - `DialogContent` : passer à `max-w-2xl` avec un padding interne cohérent, pour laisser respirer le canvas.

2. **Refonte du conteneur de prévisualisation**
   - Remplacer `max-h-[400px] overflow-hidden rounded-lg bg-muted` par un wrapper centré `flex items-center justify-center bg-muted/40 rounded-lg p-4` d'une hauteur fixe responsive (`h-[min(60vh,480px)] w-full`).
   - Le wrapper ne clippe plus la sélection (`overflow-visible` / pas d'overflow-hidden) afin que le cercle pointillé soit visible en entier, même près des bords.

3. **Image bien dimensionnée**
   - Sur le `<img>` : `max-h-full max-w-full object-contain` et retirer le `max-h-[400px]` figé.
   - L'image se laisse contenir par le wrapper, plus de débordement.

4. **Zoom propre**
   - Garder le slider mais appliquer la transformation au `<img>` via `style={{ transform: scale(${scale}), transformOrigin: 'center' }}`, et envelopper l'image dans un conteneur `overflow-hidden rounded-lg` interne pour que le zoom ne pousse pas l'UI mais reste cliquable.
   - `ReactCrop` reste autour de l'image afin que la sélection suive la même transformation visuelle (recalcul OK car react-image-crop utilise les dimensions du `<img>` rendu).
   - Étendre la plage du slider à `min=1, max=3, step=0.05` (zoom uniquement avant — pas de dé-zoom qui crée des bandes vides) et caler la valeur initiale + reset à `1`.

5. **Lisibilité contrôles**
   - Garder slider + boutons zoom/reset sous le canvas, alignés sur la largeur du wrapper.
   - Footer (`Annuler` / `Appliquer`) inchangé.

## Aucun changement fonctionnel

- Pas de modification de la logique de génération du blob (`getCroppedImg`), de `onCropComplete`, ni des appelants (avatar profil utilisateur, icône serveur, bannières) — seul le layout/sizing visuel est corrigé.
- Aucune dépendance ajoutée.

## Vérification après build

- Ouvrir Paramètres serveur → Profil du serveur → upload d'une image carrée et d'une image très large : le cercle de sélection doit être entièrement visible, image entièrement contenue, slider de zoom fluide.
- Refaire le même test sur la photo de profil utilisateur (mêmes composants).
