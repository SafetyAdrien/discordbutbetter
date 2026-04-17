

## Objectif

Refondre en profondeur le système de recherche serveur pour correspondre au modèle Discord montré dans l'image : pills de filtres dynamiques (épinglé, type d'auteur, image, etc.), autocomplétion riche (avatars + handles), résultats temps réel instantanés, et UX fluide.

## Analyse de l'existant

**`GlobalSearchModal.tsx`** (actuel) :
- Préfixes français textuels (`de:`, `dans:`, `pendant:`...) → peu intuitif
- Suggestions de préfixes affichées uniquement avec champ vide → friction
- Debounce 300ms → pas instantané
- Autocomplétion utilisateurs minimaliste (pas de "From User" header, pas d'aperçu enrichi)
- Filtres rendus comme tags simples au-dessus, pas comme pills inline avant l'input
- Pas d'icônes "shortcuts" rapides (épinglé, image, etc.) à gauche du champ

**`useGlobalSearch.ts`** :
- Utilise `useMutation` (pas réactif). Refait à chaque exécution.
- Filtre `mentions` basé sur texte `@username` — fragile (notre système utilise Snowflakes `<@ID>`)
- Filtre `from` post-traité (filter en mémoire) → résultats limités à 50 lignes serveur, peut rater
- Pas de filtre "has:image/video/file"

## Solution

### 1. `useGlobalSearch.ts` — passer en `useQuery` réactif + corrections

- Convertir `useMutation` → `useQuery` avec `queryKey: ['globalSearch', serverId, query, filters]`
- `enabled: query.length > 0 || hasAnyFilter`, `staleTime: 0`, `placeholderData: keepPreviousData` → résultats instantanés à chaque frappe sans flash
- Filtre `from` côté serveur : résoudre `username/displayName` → `userId` via les `members` passés depuis le composant, puis `.eq('author_id', resolvedId)` (vraie performance)
- Filtre `mentions` : convertir en `<@SNOWFLAKE_ID>` (cohérent avec notre système de mentions Snowflake)
- Ajouter filtre `has: 'image' | 'video' | 'file' | 'link'` → filtré sur `attachments` JSONB
- Augmenter `.limit(100)`

### 2. `GlobalSearchModal.tsx` — refonte UI à la Discord

**Nouveau layout d'input** :
```
[📌] [👤] [🖼️] | from: ▏                         [✕]
                      ┌──────────────────────────┐
                      │ From User                │
                      │ 🟢 PikaSudo  pikasudo    │
                      │ 🔵 Adrien_Sama adrien    │
                      └──────────────────────────┘
```

- **Pills d'icônes à gauche** (cliquables) : `Pin` (épinglé:), `User` (de:), `Image` (a:image), `AtSign` (mentions:), `Hash` (dans:). Clic = insère le préfixe + ouvre l'autocomplétion.
- **Input intégré** : tape directement, tokens parsés en temps réel
- **Dropdown autocomplétion enrichie** :
  - Header "From User" / "In Channel" / "Mentioning" selon contexte
  - Pour utilisateurs : avatar + display_name (gras) + `@username` (muted) — match l'image
  - Pour salons : icône type (#, 📢, 📌, etc.) + nom

**Préfixes anglais standardisés** (style Discord) :
- `from:`, `mentions:`, `has:`, `before:`, `during:`, `after:`, `in:`, `pinned:`

**Suppression du debounce** :
- Recherche déclenchée immédiatement à chaque changement (le `useQuery` + `placeholderData: keepPreviousData` évite les flashs)

**Filtre tags** :
- Affichés inline DANS l'input comme "chips" (pas au-dessus), supprimables via ✕
- Style : pilule colorée `bg-primary/15` avec préfixe en bold

**Résultats temps réel** :
- Pas de spinner intrusif si on a déjà des résultats précédents (`isPending && !data` seulement)
- Highlight du terme recherché dans le contenu via wrapping `<mark>`

### 3. Détection nouveaux préfixes

Mettre à jour `prefixMap` et `searchPrefixes` :
- `from:` → `from`
- `mentions:` → `mentions`  
- `has:` → nouveau (image/video/file/link)
- `in:` → `channel`
- `before:` / `during:` / `after:` → dates
- `pinned:` → `pinned` (true/false)

## Fichiers modifiés

- `src/hooks/useGlobalSearch.ts` — `useQuery` réactif, filtre `from` résolu serveur, filtre `has:`, filtre `mentions:` Snowflake
- `src/components/modals/GlobalSearchModal.tsx` — refonte complète UI : pills à gauche, autocomplétion enrichie type Discord, recherche instantanée sans debounce, tokens chips inline

## Résultat attendu

- Frappe = résultats instantanés sans flash
- Autocomplétion utilisateurs identique à l'image Discord (avatars + handles)
- Pills d'accès rapide à gauche pour les filtres courants
- Filtres `from:`/`mentions:` réellement performants côté serveur
- Nouveau filtre `has:` pour images/vidéos/fichiers/liens

