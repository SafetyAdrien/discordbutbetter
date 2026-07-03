## Problème

Quand l'utilisateur ouvre le side sheet et déplace le curseur dans le `HsvColorPicker`, l'interface derrière ne change PAS en direct.

Cause racine dans `useCustomTheme.ts` → `applyToDom()` :
```ts
if (!active.enabled || active.chips.length === 0) {
  root.classList.remove(HTML_CLASS);  // ← retire le thème
  return;
}
```
Tant que `draft.enabled === false` (état par défaut avant premier « Apply »), le `scheduleApply()` déclenché par chaque `setChip` ne peint rien. Le live preview n'existe que si `enabled` est déjà true → non fidèle à Discord.

## Correctif

1. **`src/components/appearance/CustomThemeSheet.tsx`**
   - À l'ouverture du sheet (`open === true`), si `draft.enabled` est `false`, appeler `setDraft({ enabled: true })` pour activer le rendu live du draft. Le thème committed reste inchangé tant que l'utilisateur ne clique pas sur « Apply ».
   - À la fermeture sans Apply, `discardDraft()` restaure l'état committed (donc `enabled: false` si c'était le cas) — comportement déjà en place, rien à changer.

2. **`src/hooks/useCustomTheme.ts`**
   - Dans `applyToDom()`, considérer aussi le draft actif : si `snap.isDirty` et `snap.draft.chips.length > 0`, forcer le rendu du gradient même si `draft.enabled` est false. Cela garantit un preview live robuste quel que soit le point d'entrée (banner, sheet, etc.).
   - Alternative plus propre : `activeForDom()` renvoie déjà le bon état ; il suffit d'assouplir la garde `!active.enabled` en `!active.enabled && !snap.isDirty` pour autoriser le preview pendant l'édition.

3. **Vérification (Playwright)**
   - Ouvrir Personnaliser → sheet visible, thème committed inchangé.
   - Déplacer le curseur du HsvColorPicker → capture avant/après montrant que la teinte de l'interface derrière change en temps réel.
   - Fermer sans Apply → l'interface revient à l'état d'origine.
   - Cliquer Apply → persistance + sync realtime OK.

## Fichiers modifiés

- `src/hooks/useCustomTheme.ts` (assouplir la garde `enabled` pendant `isDirty`)
- `src/components/appearance/CustomThemeSheet.tsx` (activer le draft à l'ouverture pour un preview immédiat)
