## Instrumentation temporaire — confirmer / infirmer l'hypothèse A

Aucun fix de logique. Uniquement des `console.log` temporaires que je retirerai au tour suivant.

### Constat préalable (lecture du code)

Snap `onSelect` actuel (`MessageInput.tsx:1019-1052`) : pour chaque range, snap uniquement si `s > r.start && s < r.end` (strict). Donc :

- Clic qui pose le caret à `8` (bord gauche de entry[1], range [8..15]) → `8 > 8` faux → **pas de snap, caret reste à 8.**
- Clic qui pose le caret à `9` (1 char dans entry[1]) → `9 > 8 && 9 < 15` vrai → target = `min(9-8=1, 15-9=6) = 1` → snap vers `r.start = 8`.

Sur le papier, le snap fait son travail dans les deux cas. Donc si l'hypothèse A est exacte, il faut savoir **si onSelect se déclenche bien entre le click et la frappe Backspace** (Safari/Firefox/Chrome peuvent différer sur l'ordre de `selectionchange` vs `keydown`, et il existe des cas où le snap ne tourne pas avant le Backspace).

### Logs à ajouter (3 endroits, ~10 lignes au total)

**1. Dans le handler `onSelect`** (`MessageInput.tsx:1019`, juste après la construction de `ranges` et avant la boucle de snap) :

```ts
const sBefore = ta.selectionStart;
const enBefore = ta.selectionEnd;
// ... boucle existante inchangée ...
if (changed) {
  console.log('[colorDbg] onSelect SNAP', { sBefore, enBefore, sAfter: s, enAfter: en, ranges });
  ta.setSelectionRange(s, en);
} else {
  console.log('[colorDbg] onSelect no-snap', { s: sBefore, en: enBefore, ranges });
}
```

**2. Dans le handler Backspace/Delete** (`MessageInput.tsx:680`, juste après lecture du caret) :

```ts
const caret = ta.selectionStart;
console.log('[colorDbg] KEYDOWN', e.key, { caret, value, entries: entries.map(e => ({ d: e.display, k: e.kind, c: (e as any).color })) });
```

**3. Dans la branche "explode"** (`MessageInput.tsx:690`, juste avant le `preventDefault`) :

```ts
console.log('[colorDbg] EXPLODE entry', { at, end, caret, token: entry.token });
```

### Reproduction demandée (côté user)

1. Insérer deux pills `■ White` séparés par un espace : `<FFFFFF`+Enter, `␣`, `<FFFFFF`+Enter.
2. Cliquer **précisément juste avant le second pill** (cible visuelle : entre l'espace et le `■`).
3. **AVANT** d'appuyer sur Backspace, vérifier dans la console :
   - `[colorDbg] onSelect …` a-t-il loggé ? Avec quelles valeurs `sBefore` et `sAfter` ?
4. Appuyer Backspace. Lire :
   - `[colorDbg] KEYDOWN Backspace { caret: ?, … }` → valeur exacte du caret.
   - `[colorDbg] EXPLODE …` apparaît-il ?

### Décision après lecture des logs

- Si `KEYDOWN` montre `caret = 9` (ou tout autre valeur > 8) sans `onSelect SNAP` préalable corrigeant à 8 → hypothèse A **confirmée** : le snap n'a pas eu le temps de tourner, ou onSelect ne s'est pas déclenché. Le fix portera sur **renforcer le snap** (par ex. snap aussi sur égalité `s === r.start + 1`, ou re-snapper explicitement en tête de `handleKeyDown` Backspace avant la boucle d'explosion).
- Si `KEYDOWN` montre `caret = 8` mais `EXPLODE` apparaît quand même → bug dans le bloc explose (test `caret > at` mal écrit, ou `at` mal calculé sur des entries dupliquées).
- Si `KEYDOWN` montre `caret = 8` et **pas** d'`EXPLODE` → la vidéo montrait probablement un autre scénario que celui décrit ; on rejoue ensemble.

### Touchpoint

- `src/components/chat/MessageInput.tsx` : 3 `console.log` temporaires aux lignes ~683 (KEYDOWN), ~691 (EXPLODE), et dans le bloc `onSelect` 1019-1052.

Aucune autre modification. Retrait des logs au tour suivant une fois le diagnostic posé.