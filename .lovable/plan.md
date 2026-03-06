

# Mentions profil : style normal avec background

## Changement

Le variant `bio` dans `UserMention` doit utiliser le même style que le variant `chat` standard (avec background violet, pas le style bleu sans background). En pratique, supprimer la branche `bio` pour que les mentions dans les profils utilisent le rendu par défaut.

## Fichier : `src/components/chat/mentions/MentionComponents.tsx`

Supprimer le bloc `if (variant === 'bio')` (lignes 20-28) pour que toutes les mentions passent par le rendu standard avec background `bg-primary/30` et hover `bg-primary`. Le prop `variant` et l'interface peuvent rester pour compatibilité future mais ne changeront plus le rendu.

