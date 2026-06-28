## Cause racine identifiée (lecture du code, pas besoin de re-tester)

`InputMarkdownOverlay.tsx`, `consumeEntryMentions()` lignes 192–215.

Quand une entry trackée est consommée, les segments de texte autour
(avant/entre/après) sont poussés dans `nodes` **encapsulés dans des
`<span>`** :

```ts
nodes.push(<span key={key++}>{text.slice(cursor, at)}</span>);     // gap
nodes.push(renderMentionEntry(entry, ...));                          // pill
nodes.push(<span key={key++}>{text.slice(cursor)}</span>);          // tail
```

Puis `renderInlineMarkdown()` ligne 304 itère sur `workingNodes` et
**discrimine uniquement string vs ReactElement** :

- `typeof node === 'string'` → passe par `renderLegacyAndSpecialMentions`
  (qui matche `<c:#…>` et produit le pill).
- ReactElement → branche ligne 326 : vérifie className, puis si
  `props.children` est string → `renderInlineMarkdownOnly(props.children)`,
  qui **n'a aucune logique mention/token legacy**.

Donc dans le scénario "pill trackée suivi de ` | <c:#ffffff>`", le
segment ` | <c:#ffffff>` arrive en ReactElement → court-circuit du
parseur legacy → token brut affiché en clair.

C'est cohérent avec le fait que l'E2E précédent fonctionnait : ces tests
n'avaient JAMAIS d'entry trackée en amont (donc `consumeEntryMentions`
retournait `consumed: false` ligne 210, et le texte restait une string
pure traitée par `renderLegacyAndSpecialMentions`).

## Correction (1 seul changement minimal)

Dans `consumeEntryMentions()` :

- Remplacer les `nodes.push(<span …>{slice}</span>)` (lignes 203 et 212)
  par `nodes.push(slice)` — pousser des **strings brutes**.

Effet : chaque gap entre entries trackées redevient une string dans
`workingNodes`, donc `renderInlineMarkdown` ligne 305 prend bien la
branche `typeof node === 'string'` et applique
`renderLegacyAndSpecialMentions` qui matche `<c:#…>`, `<@…>`, `<#…>`,
`@everyone`, `@here` sur le segment.

C'est strictement plus correct : le wrapping `<span>` était cosmétique
(aucune class, aucun style), juste un artefact d'implémentation qui
masquait par accident l'éligibilité au pass legacy.

## Vérification

1. Playwright sur `localhost:8080`, hard reload + purge SW/caches.
2. Scénario A : picker `<` → "White" → taper ` | <c:#ffffff>` → screenshot
   `1_pill_then_raw.png` → attendu : 2 pills "■ White" séparés par " | ".
3. Scénario B (sens inverse) : taper `<c:#ffffff> | ` → picker → "White" →
   screenshot `2_raw_then_pill.png` → attendu : 2 pills.
4. Scénario C (sandwich) : pill + ` <c:#ff0000> ` + pill → screenshot
   `3_sandwich.png` → attendu : 3 pills.
5. `bunx tsgo --noEmit` → 0 erreur.

Captures livrées dans la réponse via `<artifact>`. Si l'une montre du
texte brut, je ne déclare pas "corrigé".

## Touchpoint

- `src/components/chat/InputMarkdownOverlay.tsx` — 2 lignes modifiées
  dans `consumeEntryMentions` (`<span>` wrap → string brute). Rien
  d'autre.
