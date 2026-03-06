

# Prefetch des polices et styles de boutons au chargement

## Problème

Les boutons (comme "Edit Channel") subissent un flash visuel au chargement car :
1. Les polices `gg sans` utilisent `font-display: swap` — le texte apparaît d'abord avec la police système puis bascule
2. La police Google Fonts (Inter/Noto Sans) est chargée via `@import` CSS au lieu d'un `<link rel="preload">`
3. Aucun preload des fichiers `.ttf` locaux dans le HTML

## Solution

Ajouter des `<link rel="preload">` dans `index.html` pour les polices critiques utilisées par les boutons, et convertir l'import Google Fonts en `<link rel="preconnect">` + `<link rel="preload">`.

### Fichiers modifiés (2)

**1. `index.html`**
- Ajouter `<link rel="preconnect" href="https://fonts.googleapis.com">` et `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
- Ajouter `<link rel="preload">` pour les polices `gg sans` les plus utilisées (Normal 400 et Medium 500)
- Convertir le Google Fonts `@import` en `<link rel="stylesheet">` dans le `<head>` pour un chargement parallèle

**2. `src/index.css`**
- Supprimer la ligne `@import url("https://fonts.googleapis.com/css2?...")` (déplacée dans le HTML)

