
Objectif
- Corriger définitivement l’alignement du textarea dans le MessageInput mobile, tout en gardant l’input collé en bas de l’écran avec un espacement minimal.

Constat après inspection
- Le positionnement bas est géré par la structure `MobileChatView -> ChatArea` (flex colonne + zone input en bas), donc la base est bonne.
- Le décalage visuel vient surtout du `MessageInput` mobile :
  - conteneur externe réduit (`px-2 py-1.5 ...`) mais
  - textarea et overlay utilisent encore les métriques “desktop” (`pt-[13px] pb-[11px]`) quand `compact=false`,
  - bouton “+” reste en `p-3`, ce qui augmente la hauteur perçue de la barre.
- Résultat : impression de textarea non centré dans la box.

Plan d’implémentation

1) Unifier la logique “mobile compact” dans `MessageInput`
- Fichier: `src/components/chat/MessageInput.tsx`
- Ajouter un booléen dérivé (ex: `isMobileInput = isMobile && !compact`) puis un booléen de métriques (ex: `useCompactMetrics = compact || isMobileInput`).
- But: appliquer les mêmes règles de densité mobile au textarea + overlay + boutons, sans casser le mode `compact` existant.

2) Corriger le conteneur externe mobile (spacing minimal + bas d’écran)
- Garder une marge/padding minimal en mobile.
- Conserver la gestion safe-area, mais avec un padding bas propre et cohérent pour éviter l’effet “textarea qui flotte trop haut”.
- Appliquer la même logique mobile dans les états spéciaux (permission denied / follow bar) pour ne pas retomber sur un rendu desktop en mobile.

3) Centrage réel du textarea dans la barre
- Conserver `items-center` sur la rangée principale.
- Ajouter une hauteur minimale cohérente de barre (touch target mobile) pour stabiliser l’alignement.
- Basculer les paddings des boutons d’action (plus / emoji / send) sur la variante compacte en mobile afin d’éviter qu’un bouton “étire” visuellement la hauteur.

4) Synchroniser overlay et textarea (important)
- Passer `compact={useCompactMetrics}` à `InputMarkdownOverlay`.
- Utiliser `useCompactMetrics` aussi dans les classes du textarea (padding vertical, max-height).
- Cela garantit que l’overlay Markdown reste parfaitement aligné avec le texte tapé (pas de régression caret/ligne).

5) Vérification ciblée après modification
- Mobile (chat salon texte) :
  - input collé en bas avec spacing minimal,
  - textarea visuellement centré,
  - aucun grand vide sous la barre (hors safe-area réel).
- Cas fonctionnels :
  - message vide / long / multi-ligne,
  - overlay Markdown (liste, quote, code block) toujours aligné,
  - présence de pièces jointes.
- Non-régression desktop :
  - style actuel desktop inchangé,
  - mode compact (voice/thread) inchangé ou amélioré sans rupture.

Fichiers prévus
- `src/components/chat/MessageInput.tsx` (principal, suffisant pour cette correction)
- Pas de changement backend/base de données.

Risques et mitigation
- Risque: micro-décalage typographique spécifique iOS.
- Mitigation: si un décalage de 1px persiste après harmonisation des métriques, appliquer un ajustement mobile très localisé (ex. line-height/padding fin) uniquement dans `MessageInput`, sans toucher la logique globale de markdown overlay.
