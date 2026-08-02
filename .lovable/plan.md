# Icônes de salon transparentes + zone cliquable du header serveur

## 1. Fond noir sur les icônes de salon transparentes

Aujourd'hui, quand on applique une icône personnalisée à un salon, l'image passe par le recadreur puis par le compresseur :

- Le recadreur (`ImageCropper`) exporte par défaut en `image/jpeg` — un format sans canal alpha, donc toute zone transparente devient noire.
- Le compresseur (`compressImage`) peut également retomber en JPEG selon le format demandé.

Correctif :

- Détecter si le fichier choisi peut contenir de la transparence (PNG / WebP / AVIF / SVG) à l'aide de l'utilitaire existant `sourceMayHaveTransparency`.
- Dans ce cas, demander au recadreur une sortie `image/png` (alpha préservée) au lieu du JPEG.
- À l'upload, forcer un format qui conserve l'alpha : WebP si le navigateur le supporte, sinon PNG — jamais JPEG pour ces images.
- Les images opaques (JPG classiques) gardent le comportement actuel, donc aucune régression de poids de fichier.

Résultat : une icône PNG avec fond transparent reste transparente dans la liste des salons.

## 2. Zone cliquable du header de serveur

Actuellement le bouton qui ouvre la carte du serveur (description, propriétaires) occupe toute la largeur restante du header et toute sa hauteur.

Correctif :

- Réduire le bouton à la largeur de son contenu (nom du serveur + « X membres »), avec une petite marge, au lieu de `flex-1`.
- Garder la troncature du nom si celui-ci est trop long pour la barre latérale (largeur maximale = espace disponible).
- La zone survolée/cliquable s'adapte donc précisément à la taille du texte ; le reste du header n'est plus cliquable.

## Détails techniques

- `src/components/channel-settings/ChannelOverview.tsx` : conserver le `File` sélectionné pour tester la transparence, passer `outputFormat="image/png"` à `ImageCropper` quand nécessaire, et passer `format: 'image/webp' | 'image/png'` à `compressImage` (avec extension/`contentType` alignés).
- `src/components/channels/calendar/thumbnailAlpha.ts` : réutiliser `sourceMayHaveTransparency` (aucune modification).
- `src/components/layout/ChannelList.tsx` (~ligne 1711) : remplacer `flex-1 min-w-0` par une largeur auto (`w-fit max-w-full`) sur le `PopoverTrigger`, en gardant le padding et la troncature.
