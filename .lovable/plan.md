

# Aligner le début du spine avec l'icône Thread

## Analyse

L'icône `StreamlineThreads` dans le message système fait `w-3.5` (14px). Son centre horizontal est à ~7px depuis le début du conteneur flex. Or la spine est positionnée à `left-5` (20px) dans un conteneur de `w-[52px]` — décalée vers la droite par rapport à l'icône.

## Plan — `src/components/chat/ChatArea.tsx` (lignes 1303-1307)

Ajuster le positionnement de la spine pour s'aligner avec le centre de l'icône thread :

- Conteneur spine : `w-[52px]` → `w-8` (32px, suffisant pour la courbe)
- Position horizontale : `left-5` (20px) → `left-[6px]` (~centre de l'icône 14px)
- Largeur courbe : `w-[18px]` → `w-[20px]` pour que le bras horizontal atteigne le bord du conteneur

Aucun autre élément n'est modifié.

