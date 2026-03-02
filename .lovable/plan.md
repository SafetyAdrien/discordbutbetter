

# Changer la font-family globale vers IBM Plex Sans

## Contexte
L'application utilise actuellement plusieurs familles de polices :
- **Tailwind `sans`** : `Inter, system-ui, sans-serif`
- **Body CSS** : `"gg-sans", sans-serif`
- **Headings (h1-h3)** : `"Orbitron", sans-serif`
- **Display (Tailwind)** : `Orbitron, system-ui, sans-serif`
- **Ginto (Tailwind)** : `gg sans, Noto Sans, Helvetica, sans-serif`
- **Input overlay** : `"gg sans", "Noto Sans", Helvetica, sans-serif`

## Changements

### 1. `index.html` - Charger IBM Plex Sans depuis Google Fonts

Ajouter un lien vers Google Fonts dans le `<head>` pour charger les graisses 300, 400, 500, 600 et 700 d'IBM Plex Sans.

### 2. `tailwind.config.ts` - Mettre a jour les font stacks

- **`sans`** : `['IBM Plex Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif']`
- **`ginto`** : `['IBM Plex Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif']` (aligner avec la nouvelle police)

### 3. `src/index.css` - Mettre a jour la declaration body

- Remplacer `font-family: "gg-sans", sans-serif;` par `font-family: 'IBM Plex Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;`
- Mettre a jour la regle des headings (h1, h2, h3) pour utiliser la meme stack (ou conserver Orbitron si c'est intentionnel - les headings gardent Orbitron comme police display)

### 4. `src/components/chat/InputMarkdownOverlay.tsx` - Mettre a jour INPUT_FONT_FAMILY

Remplacer :
```
export const INPUT_FONT_FAMILY = '"gg sans", "Noto Sans", Helvetica, sans-serif';
```
Par :
```
export const INPUT_FONT_FAMILY = "'IBM Plex Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
```

Cela garantit que le textarea et son overlay markdown utilisent exactement la meme police.

## Fichiers concernes
- `index.html`
- `tailwind.config.ts`
- `src/index.css`
- `src/components/chat/InputMarkdownOverlay.tsx`
