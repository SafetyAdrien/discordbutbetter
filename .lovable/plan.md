

# Disparition progressive de la banniere au scroll

## Comportement actuel
La banniere s'affiche ou disparait de maniere binaire (`showBanner = scrollTop === 0`). Des que l'utilisateur scroll ne serait-ce qu'un pixel, la banniere disparait instantanement.

## Nouveau comportement
La banniere disparaitra progressivement en fonction du scroll :
- A `scrollTop = 0` : banniere 100% visible (opacite 1, hauteur pleine)
- A `scrollTop = 96px` (hauteur de la banniere) : banniere completement disparue (opacite 0, hauteur 0)
- Entre les deux : transition fluide proportionnelle au scroll

## Changements techniques

### Fichier : `src/components/mobile/MobileChannelListView.tsx`

1. **Remplacer l'etat booleen par un nombre** : `showBanner` (boolean) devient `bannerProgress` (number entre 0 et 1), ou 1 = banniere pleinement visible et 0 = completement cachee.

2. **Mettre a jour `handleChannelListScroll`** : Calculer le ratio de disparition base sur `scrollTop` divise par la hauteur de la banniere (96px). Clamper entre 0 et 1.

3. **Appliquer des styles dynamiques sur le conteneur de la banniere** :
   - `opacity` proportionnelle au progress
   - `height` qui passe de 96px a 0px
   - `overflow: hidden` pour eviter le debordement pendant la transition

4. **Gerer la barre de recherche sous la banniere** : Elle reste visible en permanence, seule la banniere image disparait progressivement.

5. **Condition d'affichage du header compact** : Remplacer `!(showBanner && bannerUrl)` par `bannerProgress < 0.1` (ou similaire) pour afficher le header compact quand la banniere est quasi invisible.

6. **La barre de recherche** reste toujours affichee (elle ne change que de style selon le contexte banniere/pas banniere).

