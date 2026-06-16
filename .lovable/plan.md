# Corriger l'écart visuel après une mention dans la zone de rédaction

## Cause du bug

Quand on insère une mention via `Tab` / clic, le textarea reçoit le token brut `<@123456789012345678>` (22 caractères) mais l'overlay markdown au-dessus affiche `@Adrien Moulin` (~14 caractères). Comme l'overlay est superposé au textarea transparent, **le curseur du textarea avance selon la longueur brute**, créant l'espace visible entre le pill et le caret. Quand on sélectionne du texte, la partie "cachée" de l'ID (les chiffres + `>`) redevient visible (image 2).

Le même problème existe pour `<#ID>` (salons) et `<@&ID>` (rôles).

## Approche retenue

Stocker dans le textarea **uniquement le texte affichable** (`@Adrien Moulin`, `#général`, `@Modérateurs`) et maintenir une **table de correspondance positionnelle** des mentions. Au moment de l'envoi, on resérialise en `<@SNOWFLAKE>` / `<#SNOWFLAKE>` / `<@&SNOWFLAKE>` via cette table.

Cela garantit que la largeur visuelle de l'overlay = largeur du contenu textarea → plus aucun écart, plus aucun ID visible lors d'une sélection.

## Modifications

### 1. `src/components/chat/MessageInput.tsx`

- Ajouter un `mentionMapRef = useRef<Array<{ start: number; end: number; token: string; display: string; kind: 'user'|'role'|'channel' }>>([])`.
- `handleMentionSelect(token, displayText)` : insérer **`displayText`** (au lieu de `token`) dans la valeur du textarea, puis enregistrer dans `mentionMapRef` l'intervalle `[startIndex, startIndex + displayText.length]` avec le `token` brut.
- `handleChange` : à chaque édition, recalculer la position des entrées du map :
  - si une édition se produit **avant** une plage → décaler `start`/`end` du delta.
  - si une édition touche/croise une plage → supprimer l'entrée (la mention devient texte libre).
  - utiliser `selectionStart` avant/après pour calculer la position de l'édition et le delta de longueur.
- Au moment de l'envoi (`performSend`), construire le contenu final : parcourir `value` en remplaçant chaque plage du map par son `token`, dans l'ordre inverse. Envoyer ce contenu sérialisé.
- Vider `mentionMapRef` après envoi / clear.

### 2. `src/components/chat/InputMarkdownOverlay.tsx`

- `hasInlineMentions` et `renderMentionsInline` doivent maintenant détecter le **texte affichable** (`@Nom`, `#salon`, `@rôle`) au lieu des tokens bruts.
- Recevoir le `mentionMap` (positions + kind + display + couleur de rôle) en prop depuis `MessageInput`.
- Stylisation par plage : pour chaque entrée du map dont `[start, end]` se trouve dans la portion de texte rendue, encadrer ce segment d'un `<span>` au style "pill" déjà utilisé (`bg-primary/30 text-[#dee0fc]` pour user/channel, couleur du rôle pour role).
- Le rendu n'introduit plus de chaîne plus courte que la source → alignement parfait avec le textarea.
- Conserver le fallback actuel (regex `<@…>`) pour les messages déjà rédigés / brouillons contenant encore des tokens.

### 3. `src/components/chat/MentionAutocomplete.tsx`

Aucun changement de signature : `onSelect(token, displayText)` reste, c'est `MessageInput` qui choisit désormais d'insérer `displayText` et de mémoriser `token`.

### 4. Cas couverts

- Tab / clic d'autocomplete → insère le display, mappe le token.
- Suppression d'un caractère à l'intérieur d'une mention → l'entrée du map disparaît, le texte devient libre (comportement Discord).
- Copier/coller, undo/redo → l'édition est traitée comme une modification de plage, donc invalide les entrées concernées.
- `@everyone` / `@here` → inchangé (déjà du texte affichable).

## Détails techniques

- Le map vit en `useRef` (pas d'état) pour éviter les re-renders et garder la synchro avec le textarea.
- `useEffect` sur `value` non requis : tout passe par `onChange` (déjà unique source d'édition).
- L'overlay reste piloté par `value` + `mentionMapRef.current` ; on déclenche un re-render via un compteur (`useState`) bumpé dans `handleMentionSelect` et `handleChange` pour que l'overlay reflète le map à jour.

## Vérification

1. Insérer `@membre` via Tab → curseur collé au pill, aucun chiffre visible.
2. Sélectionner du texte autour → la sélection ne révèle plus d'ID Snowflake.
3. Insérer `#salon` puis `@&rôle` → même comportement.
4. Envoyer le message → le contenu reçu côté DB contient bien `<@SNOWFLAKE>` / `<#…>` / `<@&…>`.
5. Supprimer un caractère au milieu d'une mention → elle redevient du texte libre, l'envoi ne contient plus de token.
