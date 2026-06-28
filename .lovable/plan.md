## Diagnostic
Le `DialogContent` mesure 320 px (border-box, padding 24/24 → 272 px de contenu), mais la racine `ModernColorPicker` mesure 345 px et déborde de **49 px à droite** (gauche OK à 24 px). Cause : le dialog est en `grid` ; le track se cale sur le **min-content** du picker, qui n'a ni `w-full` ni `min-w-0`. La barre du bas contient un `<input>` sans `min-w-0` (taille intrinsèque ~20 chars) + bouton format `min-w-[80px]`, ce qui gonfle le min-content à 345 px.

## Correctifs (parité gauche/droite stricte, aucune autre régression)

### Fix 1 — `src/components/profile/calendar/ModernColorPicker.tsx`
Sur la racine, ajouter `w-full min-w-0` au début du `cn(...)` :
```diff
- 'rounded-2xl border border-border bg-card p-3 space-y-3 select-none',
+ 'w-full min-w-0 rounded-2xl border border-border bg-card p-3 space-y-3 select-none',
```
Sur l'`<input>` de la barre du bas, ajouter `min-w-0` (sur l'input lui-même, pas seulement son wrapper) — déjà présent via `flex-1 min-w-0`, mais l'input HTML a une taille intrinsèque ; passer aussi `size={1}` ou laisser le `min-w-0` actuel suffira une fois la racine corrigée.

### Fix 2 (défensif) — `src/components/chat/MessageInput.tsx`
Sur le `<DialogContent>` du picker, ajouter `overflow-hidden` à la classe pour garantir qu'aucun overflow visuel ne fuit même si un futur enfant grandit :
```diff
- <DialogContent className="sm:max-w-[320px]">
+ <DialogContent className="sm:max-w-[320px] overflow-hidden">
```

## Vérification après build
Re-mesurer en preview :
- `DialogContent.getBoundingClientRect().width` = 320
- `picker.getBoundingClientRect().left - dialog.left` = 24
- `dialog.right - picker.getBoundingClientRect().right` = 24
- Plus aucun overflow horizontal (`scrollWidth === clientWidth` sur le dialog).
- `tsgo --noEmit` : 0 erreur.
