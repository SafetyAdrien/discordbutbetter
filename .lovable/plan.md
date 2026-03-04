

# Alignement Markdown sur la documentation Discord officielle

## Analyse

Après comparaison de l'implémentation actuelle avec le guide Discord Markdown, l'ensemble des formats est déjà correctement supporté :
- **Gras** `**texte**` ✓
- **Italique** `*texte*` / `_texte_` ✓
- **Souligné** `__texte__` ✓
- **Liens** `[texte](url)` ✓
- **Bloc de codes** `` `code` `` et ` ```code``` ` ✓
- **Spoiler** `||texte||` ✓
- **Barré** `~~texte~~` ✓
- **Listes** `-` / `*` / `1.` ✓

## Seule correction nécessaire

### Citations (`>`) — espace obligatoire après `>`

Le guide officiel spécifie : *"The syntax to use Block Quotes is > or >>> **followed by a space**"*.

Or, dans le dernier correctif, on a ajouté la détection de `>texte` sans espace dans l'overlay (`parseLines`). Cela ne correspond pas au comportement officiel Discord.

**Fichier** : `src/components/chat/InputMarkdownOverlay.tsx`

- **`parseLines`** (ligne 37) : retirer la condition `(line.startsWith('>') && line.length > 1 && line[1] !== '>')`. Ne garder que `line.startsWith('> ') || line.startsWith('>>> ')`.

C'est le seul écart par rapport au guide. Tous les autres formats sont conformes.

