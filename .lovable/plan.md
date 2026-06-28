## Confirmations de lecture

**1. Z-index textarea vs overlay** — `InputMarkdownOverlay` est `absolute inset-0 pointer-events-none` (sans z-index explicite), le `<textarea>` est `relative z-10`. Tout clic sur le glyphe ■ frappe le textarea natif à la position de caractère correspondante. ✅

**2. Logique `onSelect` (lignes 963-996)** — itère `mentionEntriesRef.current`, calcule des ranges via `value.indexOf(entry.display, cur)`. Cette passe est directement réutilisable dans un **nouveau `onClick`** (en complément, pas en remplacement) en gardant l'index d'entry pour tester `entry.kind === 'color'`. ✅

**3. Normalisation hex — point critique confirmé en lecture**
- `src/lib/colorNames.ts:232` — `normalizeHex()` retourne déjà la forme canonique `#rrggbb` lowercase via `parseHex()` qui expand le format 3 chiffres (`fff` → `ffffff`) à la ligne 198. ✅ aucune modification de cette fonction nécessaire.
- `src/lib/markdown.tsx:136` — `COLOR_SWATCH_PATTERN = /<c:#([0-9a-fA-F]{6})>/g` exige strictement **6 chiffres**. Un token `<c:#fff>` ne serait **pas** reconnu → le swatch resterait invisible dans le message envoyé. **C'est pour cela que la normalisation est obligatoire avant de construire le token.** ✅ diagnostic confirmé.

---

## Implémentation

### A. `MessageInput.tsx` — détection du clic sur entry couleur

Nouvel état :
```
const [colorEditor, setColorEditor] = useState<{
  entryIndex: number;
  hex: string; // toujours #rrggbb (forme normalisée depuis l'entry)
  rect: { left: number; top: number; width: number; height: number };
} | null>(null);
```

Sur `<textarea>`, ajouter `onClick` en plus de `onSelect` existant :
- Reconstruire `ranges` comme `onSelect` mais conserver l'index global d'entry.
- Si sélection collapsed et tombe dans une range `kind === 'color'` :
  - récupérer le span via `overlayRef.current?.querySelector('[data-color-entry-index="<idx>"]')` ;
  - lire `getBoundingClientRect()` ;
  - `setColorEditor({ entryIndex, hex: entry.color!, rect })`.

### B. Curseur main au survol

`onMouseMove` du textarea throttlé via `requestAnimationFrame` :
- pour chaque entry `kind === 'color'`, lire le rect du span via le selector `data-color-entry-index` ;
- si `(clientX, clientY)` ∈ rect → `ta.style.cursor = 'pointer'`, sinon `''`.

`onMouseLeave` → reset. Pas d'élément miroir — on s'appuie sur les rects réels des spans (métriques identiques au textarea).

### C. Annotation des spans (`InputMarkdownOverlay.tsx`)

- Au site d'appel (ligne 196), passer l'index global :
  ```
  nodes.push(renderMentionEntry(entry, key++, consumer.idx - 1));
  ```
- `renderMentionEntry(entry, key, entryIndex)` — pour `kind === 'color'`, ajouter `data-color-entry-index={entryIndex}` sur le `<span>`. Aucune autre modification visuelle.

### D. Popover custom d'édition (`MessageInput.tsx`)

Rendu conditionnel `{colorEditor && ...}` en racine du composant : `<div>` `position: fixed`, ancré à `colorEditor.rect.left` / `colorEditor.rect.top - height - 6` (au-dessus du glyphe), `z-50`, `bg-popover`, border + shadow + padding. Fermeture : clic extérieur (overlay invisible `fixed inset-0`) + Échap.

Contenu :

1. **Input texte libre**
   - `import { normalizeHex, NAMED_COLORS } from '@/lib/colorNames'`.
   - state local `draft: string` initialisé à `colorEditor.hex` (déjà `#rrggbb`).
   - **Validation live** mémoïsée :
     ```ts
     const resolvedHex: string | null = useMemo(() => {
       const v = draft.trim();
       // 1) hex (#rgb, rgb, #rrggbb, rrggbb) — normalizeHex gère les 4 formes
       const fromHex = normalizeHex(v);
       if (fromHex) return fromHex;
       // 2) nom CSS / NAMED_COLORS (case-insensitive)
       const lc = v.toLowerCase();
       const named = NAMED_COLORS.find((c) => c.name.toLowerCase() === lc);
       return named ? normalizeHex(named.hex) : null;
     }, [draft]);
     ```
   - **`resolvedHex` est toujours soit `null`, soit une chaîne `#rrggbb` 6 chiffres lowercase.** Jamais la saisie brute.
   - Bordure rouge + petit texte d'erreur si `resolvedHex === null`.

2. **`<ModernColorPicker value={resolvedHex ?? colorEditor.hex} onChange={(h) => setDraft(h)} />`** synchronisé sur la valeur normalisée courante. `onChange` du picker renvoie déjà du `#rrggbb`, donc `draft` reste cohérent.

3. **Bouton "Éditer"** aligné à droite, désactivé si `resolvedHex === null`. Au clic :
   ```ts
   const e = mentionEntriesRef.current[colorEditor.entryIndex];
   mentionEntriesRef.current[colorEditor.entryIndex] = {
     ...e,
     color: resolvedHex,                  // #rrggbb
     token: `<c:${resolvedHex}>`,         // <c:#rrggbb> — 6 chiffres garantis
   };
   setMentionRev(r => r + 1);
   setColorEditor(null);
   ```
   `display` (■) reste inchangé → aucun déplacement de texte.

### Règle "jamais la saisie brute"

Audit explicite dans le code de la review : la chaîne `draft` (saisie brute, peut être `#fff`, `red`, etc.) n'est utilisée QUE pour l'affichage de l'input et la validation. Toute valeur qui sort vers le picker, vers `entry.color` ou vers `entry.token` passe obligatoirement par `resolvedHex`.

### Touchpoints

- `src/components/chat/InputMarkdownOverlay.tsx` : signature `renderMentionEntry` (+ `entryIndex`), `data-color-entry-index` sur le span color, appel mis à jour.
- `src/components/chat/MessageInput.tsx` : state `colorEditor`, `onClick` textarea, `onMouseMove`/`onMouseLeave` (cursor), JSX popover custom avec input + ModernColorPicker + bouton Éditer, import `normalizeHex` + `NAMED_COLORS`.

## Vérification

- Hover ■ → curseur main.
- Clic ■ → popover ancré au-dessus du glyphe.
- Saisie d'un hex 3 chiffres ou d'un nom valide → preview correcte dans le picker.
- **Test spécifique 3 chiffres** :
  1. Cliquer ■ existant.
  2. Vider l'input, taper `#fff`.
  3. Vérifier que la preview du picker est blanche (#ffffff).
  4. Cliquer "Éditer".
  5. Inspecter `mentionEntriesRef.current[idx]` → `color === '#ffffff'`, `token === '<c:#ffffff>'` (6 chiffres, **pas** `<c:#fff>`).
  6. Envoyer le message.
  7. Vérifier dans le message rendu (post-envoi) que `COLOR_SWATCH_PATTERN` matche → `ColorSwatchToken` rendu avec le swatch blanc visible (et non pas un texte brut `<c:#fff>` non reconnu).
- `tsgo --noEmit` : 0 erreur.
