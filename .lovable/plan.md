## Correction des espacements messages

Mes ajustements précédents ont créé trop d'espace vertical entre le nom d'auteur et la première ligne de contenu. La cible Discord (image 2) montre :
- Le texte `@everyone` colle quasiment au nom `Adrien_Sama` (gap vertical ~0px, géré uniquement par le line-height naturel).
- L'avatar est proche du texte horizontalement (gap modéré, pas large).
- Petit espace au-dessus du nom (`pt-[17px]` — OK, à conserver).

### Changements dans `src/components/chat/ChatArea.tsx`

| Élément | État après dernière édition | Correction |
|---|---|---|
| `mt-[2px]` sur `<div>` du `MarkdownText` (lignes 1570, 1693) | crée gap visible sous le nom | **supprimer** (`mt-0`) |
| `gap-4` sur la rangée avatar + contenu (lignes 1470, 1620) | trop large | revenir à `gap-3` |
| `mt-[2px]` sur l'`Avatar` | OK | conserver |
| `pt-[17px]` premier-du-groupe | OK | conserver |
| `indent={56}` du RepliedLine | avec gap-3, avatar w-10 → 40+12=52, donc mettre `indent={52}` pour rester aligné | passer à `indent={52}` |

Résultat attendu : nom + 1ʳᵉ ligne collés (comme Discord), espace au-dessus du groupe conservé, gap avatar/texte modéré.

### Fichiers touchés
- `src/components/chat/ChatArea.tsx` uniquement
