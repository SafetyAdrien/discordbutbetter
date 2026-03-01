
Objectif: rendre TooltipContent réellement visible au survol (hover), y compris dans les zones avec overlays/popovers/containers scrollables.

Constat après inspection
1) Le composant global `src/components/ui/tooltip.tsx` a bien un `z-[9999]`, mais `TooltipContent` n’est pas rendu via un portal par défaut.
2) Sans portal, un tooltip peut rester piégé dans un contexte de stacking/overflow/transform (cas fréquent dans cette UI avec DnD, panneaux, modales, sidebars).
3) `src/components/chat/PollDisplay.tsx` force localement `className="... z-[100]"` sur `TooltipContent`, ce qui peut diminuer la priorité visuelle (et contredire le fix global).

Plan d’implémentation
1) Solidifier le composant tooltip global
   - Fichier: `src/components/ui/tooltip.tsx`
   - Envelopper `TooltipContent` dans `TooltipPrimitive.Portal` pour sortir du contexte visuel local et l’afficher au-dessus de l’UI.
   - Verrouiller un niveau de couche élevé côté composant (pas seulement dépendre des classes appelantes), afin d’éviter qu’un `className` local baisse le z-index.

2) Supprimer les overrides de z-index qui cassent l’intention globale
   - Fichier: `src/components/chat/PollDisplay.tsx`
   - Retirer les `z-[100]` passés à `TooltipContent`.
   - Garder les styles fonctionnels (taille texte/max-width), sans override de couche.
   - Simplifier l’usage si nécessaire (portal explicite devenu redondant si le composant global le gère).

3) Vérifications fonctionnelles ciblées
   - Hover sur icônes serveur (desktop): le tooltip doit apparaître au-dessus des panneaux adjacents.
   - Hover dans zones avec couches concurrentes (popover/menu/modal): tooltip visible et lisible.
   - Hover sur avatars de votes (PollDisplay): tooltip visible, non coupé.
   - Régression: pas d’erreur runtime, pas de décalage de position évident, pas de clipping.

Critères d’acceptation
- Tous les `TooltipContent` sont visibles au hover dans les écrans concernés.
- Aucun tooltip ne passe “derrière” une popover/modale/panneau.
- Pas de régression sur l’UX tooltip existante (position, animation, lisibilité).

Détails techniques (pour implémentation)
- Fichiers à modifier:
  - `src/components/ui/tooltip.tsx`
  - `src/components/chat/PollDisplay.tsx`
- Aucun changement backend/base de données nécessaire.
