
## Analyse

Dans `GlobalSearchModal.tsx`, après ajout d'un premier filtre (chip), l'autocomplétion des préfixes suivants ne s'affiche pas immédiatement. Il faut vérifier la logique actuelle.
<lov-tool-use id="toolu_vrtx_01GqcT5ZoKNNFeoTV9B5u2sj" name="code--search_files" integration-id="code" data="{\"query\": \"searchPrefixes|showPrefixes|prefixSuggestions|setShowAutocomplete\", \"include_patterns\": \"src/components/modals/GlobalSearchModal.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01VzT39m8gx4EkT5BtxoXeeg" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/modals/GlobalSearchModal.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01ASXH6RDDcM71DG1mLcaDLN" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/modals/GlobalSearchModal.tsx\", \"lines\": \"486-594\"}">
</lov-tool-use>
J'ai bien compris le problème. Actuellement, le dropdown "Search options" (qui liste tous les préfixes disponibles) ne s'affiche QUE si :
- `showShortcuts === true` (donc focus sur input vide)
- ET `!rawInput && !hasActiveFilters` (donc pas de filtre actif)

Donc dès qu'un filtre est ajouté, le dropdown des préfixes restants disparaît. L'utilisateur doit cliquer ailleurs ou re-focuser pour voir les options suivantes → délai/friction.

<lov-plan>

## Problème

Quand l'utilisateur sélectionne un premier filtre (ex: `from:Pikasudo`), le dropdown "Search options" qui liste les préfixes disponibles (`mentions:`, `in:`, `has:`, etc.) **disparaît immédiatement** car la condition d'affichage est `!rawInput && !hasActiveFilters`. Pour voir les filtres suivants, il faut re-cliquer ou re-focuser → friction.

L'utilisateur veut que les **filtres suivants apparaissent instantanément à la suite**, sans aucun délai, après chaque sélection.

## Solution

### `src/components/modals/GlobalSearchModal.tsx`

**1. Toujours afficher les préfixes restants quand l'input est focused et qu'il n'y a pas d'autocomplétion active**

Modifier la condition d'affichage du dropdown "Search options" :
- Avant : `showShortcuts && !activeAutocomplete` + condition cachée `!rawInput && !hasActiveFilters` au focus
- Après : `isInputFocused && !activeAutocomplete && remainingPrefixes.length > 0` — affiché tant qu'il reste des filtres à sélectionner

**2. Filtrer dynamiquement les préfixes déjà utilisés**

Calculer `remainingPrefixes` = `searchPrefixes` moins ceux déjà présents dans `mergedFilters`. Ainsi après avoir choisi `from:`, le dropdown affiche immédiatement `mentions:`, `in:`, `has:`, `before:`, `during:`, `after:`, `pinned:`.

**3. Maintenir le focus après sélection d'un filtre**

- `handleAutocompleteSelect` : déjà fait (`inputRef.current?.focus()`), mais réafficher immédiatement le dropdown des préfixes restants via `setShowShortcuts(true)` à la fin
- `handleShortcutClick` (auto-filters comme `has:image`) : idem, garder le dropdown ouvert pour permettre l'enchaînement instantané
- `handleRemoveFilter` : refocus + réafficher le dropdown

**4. Remplacer `setTimeout(150)` du onBlur par une logique plus stricte**

Le `setTimeout(() => setShowShortcuts(false), 150)` actuel est lent. Utiliser `onMouseDown={(e) => e.preventDefault()}` sur tous les boutons (déjà en place) et fermer immédiatement uniquement si le focus part vraiment ailleurs (vérifier `relatedTarget`).

**5. État `isInputFocused`**

Remplacer `showShortcuts` par un véritable état `isInputFocused` mis à jour via `onFocus`/`onBlur`. Le dropdown s'affiche tant que :
- input focused
- pas d'autocomplétion de valeur active
- il reste des préfixes disponibles

## Résultat

- Sélection d'un filtre → dropdown des préfixes restants réapparaît **instantanément** (0ms)
- Préfixes déjà actifs n'apparaissent plus dans la liste
- Enchaînement fluide : `from:user` → click → `in:channel` → click → `has:image` → click, sans aucune friction

## Fichier modifié

- `src/components/modals/GlobalSearchModal.tsx`

