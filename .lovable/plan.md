

# Couleurs Markdown uniquement pour les blocs de code

## Problème
Actuellement, `renderInlineMarkdown` applique des couleurs distinctes à chaque type de formatage (doré pour le gras, vert pour l'italique, bleu pour le souligné, rose pour le code inline, etc.). L'utilisateur souhaite que seuls les blocs/inline de code aient des couleurs spéciales. Les autres formatages (gras, italique, souligné, barré, spoiler, liens) doivent garder la couleur de texte normale (`text-foreground`), avec uniquement les marqueurs de syntaxe atténués.

## Changements

### `src/components/chat/InputMarkdownOverlay.tsx`

Modifier `renderInlineMarkdown` pour supprimer les couleurs spéciales sur tous les types sauf le code :

- `**bold**` : contenu → `text-foreground` (au lieu de doré)
- `__underline__` : contenu → `text-foreground underline` (au lieu de bleu)
- `*italic*` / `_italic_` : contenu → `text-foreground` (au lieu de vert)
- `~~barré~~` : contenu → `text-foreground line-through` (au lieu de muted)
- `||spoiler||` : contenu → `text-foreground bg-muted/50` (garder le fond, pas de couleur spéciale)
- `[text](url)` : texte → `text-foreground`, url → `text-muted-foreground/40`
- `` `code` `` : **conserver** `bg-muted/40 text-[hsl(340,65%,65%)]` (couleur rose)
- `codeBlockLine` / `codeBlockDelimiter` : **conserver** les styles existants

Les marqueurs de syntaxe (`**`, `~~`, `` ` ``, etc.) restent en `text-muted-foreground/50`.

