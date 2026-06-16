Repositionner le bouton « Aller en bas » pour qu'il soit entièrement au-dessus du conteneur de rédaction (et non à cheval sur sa bordure supérieure).

Changement :
- Dans `src/components/chat/ChatArea.tsx`, remplacer `-top-1.5` par un positionnement qui place le pill complètement au-dessus de l'input avec un petit écart (~6px). Concrètement, utiliser `bottom-full mb-1.5` (ou équivalent `-translate-y-full` + marge), sans changer le z-index ni l'animation.
- Aucune autre modification (logique, scroll, édition) : seule la position visuelle du pill est corrigée.