

# Ajout de nouveaux formats Markdown

## Formats a ajouter (inspires de Discord)

### 1. Horodatages dynamiques
**Syntaxe** : `<t:TIMESTAMP:FORMAT>`
- Formats : `t` (heure courte), `T` (heure longue), `d` (date courte), `D` (date longue), `f` (date+heure), `F` (date+heure longue), `R` (relatif "il y a 2h")
- Rendu : badge avec l'heure/date formatee selon la locale de l'utilisateur

### 2. URLs automatiques (auto-linking)
**Syntaxe** : texte contenant `https://example.com` sans syntaxe `[]()`
- Actuellement, les URLs brutes ne sont pas cliquables sauf les liens message Discord
- Detection automatique des URLs (`https?://...`) et transformation en liens cliquables

### 3. Ligne horizontale (separateur)
**Syntaxe** : `---` ou `***` ou `___` (seul sur une ligne)
- Rendu : trait horizontal separateur, comme les `<hr>` sous les headers mais utilisable librement

### 4. Texte en exposant (non-Discord, mais utile)
Ce point est optionnel et sort du scope Discord strict.

---

## Plan d'implementation

### Fichiers concernes

| Fichier | Changement |
|---|---|
| `src/lib/markdown.tsx` | Ajouter les patterns inline (timestamps, auto-link) et bloc (separateur) |
| `src/components/chat/InputMarkdownOverlay.tsx` | Ajouter le type `separator` pour le rendu live dans l'input |
| `src/index.css` | Styles pour le badge timestamp |

### Detail technique

#### 1. Horodatages dynamiques (`<t:TIMESTAMP:FORMAT>`)

**Inline pattern** a ajouter dans `tokenizeInline` :
- Regex : `<t:(\d+):([tTdDfFR])>`
- Nouveau type de token : `timestamp`
- Rendu : composant `TimestampBadge` qui formate le timestamp Unix avec `Intl.DateTimeFormat` ou `date-fns` (deja installe) selon le format demande
- Style : badge avec fond translucide similaire aux mentions, texte clair

#### 2. Auto-linking des URLs

**Inline pattern** a ajouter dans `tokenizeInline` :
- Regex : `(https?:\/\/[^\s<>\])"]+)` (URLs brutes hors syntaxe markdown existante)
- Priorite basse dans le parseur (apres les liens masques `[text](url)` et les message link embeds)
- Rendu : `<a>` cliquable avec style identique aux liens masques existants
- Troncature visuelle optionnelle pour les URLs tres longues (afficher max ~60 chars)

#### 3. Separateur horizontal

**Block pattern** a ajouter dans `parseBlocks` :
- Detection : ligne composee uniquement de `---`, `***`, ou `___` (3+ caracteres)
- Nouveau type de bloc : `separator`
- Rendu : `<hr>` stylise comme les separateurs sous les headers (border-[hsl(228,6%,26%)])
- Mise a jour de `InputMarkdownOverlay` pour reconnaitre ce type de ligne

### Ordre d'implementation

1. Separateur horizontal (le plus simple, bloc uniquement)
2. Auto-linking des URLs (inline, priorite basse dans le parseur)
3. Horodatages dynamiques (inline + nouveau composant de rendu)
