

# Audit border-radius + Réduction radius/spacing des salons

## 1. Audit border-radius : remplacer les valeurs px par des tokens

**Fichier `src/index.css`** — 5 occurrences à migrer :

| Ligne | Actuel | Nouveau | Contexte |
|-------|--------|---------|----------|
| 303, 307 | `border-radius: 18px` | `border-radius: var(--radius-xl)` | `.server-icon:hover` et `.active` |
| 599 | `border-radius: 4px` | `border-radius: var(--radius-sm, 4px)` | Spoiler text (`.spoiler-hidden`) |
| 777 | `border-radius: 3px` | `border-radius: 3px` | Scrollbar pseudo-element — conserver tel quel (trop petit pour un token) |

Les `rounded-[3px]` dans `MentionComponents.tsx` et `InputMarkdownOverlay.tsx` sont des inline badges très petits — on les conserve car `rounded-sm` (≈10px) serait trop grand pour du texte inline.

Les `rounded-[2px]` dans `chart.tsx` sont des indicateurs de légende — conserver tel quel.

**Fichier `tailwind.config.ts`** — Ajouter les tokens `xl`, `2xl`, `3xl` au mapping Tailwind :

```ts
borderRadius: {
  '3xl': 'var(--radius-3xl)',
  '2xl': 'var(--radius-2xl)',
  xl: 'var(--radius-xl)',
  lg: 'var(--radius)',
  md: 'calc(var(--radius) - 2px)',
  sm: 'calc(var(--radius) - 4px)',
},
```

## 2. Réduire le radius du hover/select des salons (style Discord)

Discord utilise un `border-radius: 4px` sur les items de salon. Actuellement on a `var(--radius-xl)` = 20px, beaucoup trop arrondi.

**Fichier `src/index.css`** :
```css
.channel-item {
  border-radius: 4px;  /* Discord standard au lieu de var(--radius-xl) */
}
```

## 3. Réduire le spacing des salons

Discord utilise `py-[6px] px-2` (padding vertical de 6px). Actuellement on a `py-2` (8px) et `px-3` (12px).

**Fichier `src/index.css`** :
```css
.channel-item {
  @apply flex items-center gap-2 px-2 py-[6px] cursor-pointer
         text-muted-foreground hover:text-foreground;
  border-radius: 4px;
}
```

Changements : `gap-2.5` → `gap-2`, `px-3` → `px-2`, `py-2` → `py-[6px]`.

## Résumé des fichiers modifiés

1. **`tailwind.config.ts`** — Ajouter tokens radius xl/2xl/3xl
2. **`src/index.css`** — Migrer server-icon vers tokens, réduire channel-item radius à 4px et spacing

3 fichiers, changements mineurs et ciblés.

