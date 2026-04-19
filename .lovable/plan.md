
## Problème
Dans `AnnouncementComposer.tsx`, la zone du textarea "Message #Annonce" (ContentMsg) affiche un effet hover (changement de fond visible sur la capture). Le champ "Titre (optionnel)" au-dessus n'a pas cet effet — c'est l'état désiré.

## Investigation nécessaire
Lire `AnnouncementComposer.tsx` pour identifier la classe responsable du hover sur la zone textarea/contenu, et la comparer au champ Titre pour aligner le comportement.

## Changement
Retirer la classe `hover:bg-*` (probablement `hover:bg-surface-hover` ou équivalent) du wrapper du textarea du contenu, afin qu'il se comporte comme l'input du Titre (fond statique, pas de changement au survol).

## Garantie « ne casse rien »
- Focus, placeholder, padding, hauteur, markdown overlay : inchangés
- Seule la pseudo-classe `:hover` du fond est retirée
- Le champ Titre reste tel quel (référence)

## Fichier modifié
- `src/components/channels/announcement/AnnouncementComposer.tsx` (1 classe `hover:` retirée sur le wrapper du textarea de contenu)
