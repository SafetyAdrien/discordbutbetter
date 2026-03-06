

# Mentions profil : style bleu Discord avec background

## Changement

Rétablir le rendu conditionnel `variant === 'bio'` dans `UserMention` avec le style Discord bleu :
- Background : `rgba(88, 101, 242, 0.3)` (bleu Discord semi-transparent)
- Texte : `rgb(88 101 242)` / `#5865F2`
- Hover : `rgba(88, 101, 242, 0.5)` + underline

## Fichier : `src/components/chat/mentions/MentionComponents.tsx`

Ajouter un bloc `if (variant === 'bio')` avant le return principal (ligne 20) qui retourne un `<span>` avec :
```
bg-[rgba(88,101,242,0.3)] text-[#5865F2] hover:bg-[rgba(88,101,242,0.5)] hover:underline
```

Pas de tooltip en bio, juste le span cliquable avec `@displayName`.

