

## Problème identifié

En corrigeant l'erreur de build CSS (déplacement du `@import` Google Fonts en ligne 1), la police **Inter** se charge maintenant correctement — avant, elle échouait silencieusement car le `@import` était mal placé.

Cela révèle un **bug préexistant** dans `src/index.css` ligne 207 :

```css
body {
  @apply bg-background text-foreground font-sans antialiased;
  font-family: "gg-sans", sans-serif;  /* ← TYPO : "gg-sans" avec tiret */
}
```

Les `@font-face` déclarent `"gg sans"` (avec espace), mais le body utilise `"gg-sans"` (avec tiret). Résultat : la police gg sans n'est jamais appliquée, et le `@apply font-sans` met **Inter** partout.

De plus, les titres h1/h2/h3 sont forcés en **Orbitron** (ligne 213), ce qui n'est pas cohérent avec un clone Discord.

## Correctifs

### `src/index.css`

1. **Ligne 207** : corriger `"gg-sans"` → `"gg sans"` pour que la police custom s'applique correctement au body.

2. **Lignes 210-214** : retirer le `font-family: "Orbitron"` sur h1/h2/h3 pour qu'ils héritent de `gg sans` comme le reste de l'interface.

### Fichier unique modifié
- `src/index.css` (2 corrections)

