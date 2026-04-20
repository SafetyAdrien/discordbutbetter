

## Objectif

Unifier le caractère de déclenchement des mentions : un seul `@` ouvre désormais un dropdown unifié contenant **utilisateurs**, **rôles** et **mentions globales** (`@everyone` / `@here`), avec un séparateur visuel entre les utilisateurs d'un côté et les rôles + mentions globales de l'autre. Le préfixe `@&` disparaît côté UX.

## Comportement final

### Saisie utilisateur

| Avant | Après |
|---|---|
| `@john` → menu utilisateurs | `@john` → dropdown unifié filtré (utilisateurs + rôles + globaux) |
| `@&admin` → menu rôles | `@admin` → dropdown unifié, filtre sur rôles aussi |
| `@everyone` tapé manuellement | Suggéré dans le dropdown unifié dès `@e` |

Le déclencheur `@&` est **complètement supprimé** côté input. Un seul `@` ouvre tout.

### Dropdown unifié

Structure verticale avec séparateur :

```
┌─────────────────────────────────┐
│ MEMBRES                         │
│  👤 Alice          alice        │
│  👤 Bob            bob          │
├─── separator ───────────────────┤
│ RÔLES & MENTIONS GLOBALES       │
│  @ everyone                     │
│  @ here                         │
│  @ Admin           (rouge)      │
│  @ Modérateur      (vert)       │
└─────────────────────────────────┘
```

- Section **Membres** en haut
- Composant `Separator` shadcn entre les deux blocs
- Section **Rôles & Mentions globales** en bas, avec `@everyone` et `@here` épinglés en tête (si permission `mention_everyone`)
- Filtre commun appliqué à toutes les entrées : la requête `@adm` filtre simultanément utilisateurs ET rôles
- Si une seule des deux sections a des résultats, l'autre + le séparateur ne s'affichent pas

### Format câblé (inchangé)

Le format stocké en base reste **strictement identique** :
- Utilisateur → `<@SNOWFLAKE>`
- Rôle → `<@&SNOWFLAKE>`
- `@everyone` / `@here` → littéral

Seul le **trigger de saisie** change. Le rendu Markdown, le trigger SQL, les notifications restent inchangés.

## Modifications

### 1. `src/components/chat/MessageInput.tsx`

**Supprimer** la détection du préfixe `@&` (lignes 267-279).

**Modifier** la détection `@` (lignes 307-319) pour qu'elle ouvre un nouveau type unifié `'user-role'` au lieu de `'user'` strict.

```ts
// Nouveau : un seul match @ qui couvre tout
const mentionMatch = beforeCursor.match(/(?:^|\s)(@(?!&)[\w\u00C0-\u024F]*)$/);
if (mentionMatch) {
  return { type: 'unified', query, startIndex, triggerLength: 1 };
}
```

Mettre à jour `MentionState` pour accepter le type `'unified'` (ou réutiliser `'user'` en élargissant son comportement dans l'autocomplete).

### 2. `src/components/chat/MentionAutocomplete.tsx`

**Refonte** du composant pour le type `user` (renommé conceptuellement en "unified") :

- Le composant accepte `members`, `roles` et `canMentionEveryone` simultanément quand `type === 'user'`
- Calcule deux listes filtrées :
  - `filteredMembers` : utilisateurs matchant la query
  - `filteredRolesAndGlobal` : `@everyone` + `@here` (si permission) + rôles matchant la query
- Rend deux sections séparées par `<Separator />` (shadcn) si les deux ont des résultats
- Navigation clavier (↑/↓) traverse les deux sections de manière fluide via un index global
- Header "MEMBRES" + header "RÔLES & MENTIONS GLOBALES"

Le type `role` séparé est **supprimé** de l'API publique du composant (plus aucun appelant ne le déclenche).

### 3. `handleMentionSelect` dans `MessageInput.tsx`

Aucun changement de format de sortie : `handleSelect` dans `MentionAutocomplete` continue d'émettre :
- `<@SNOWFLAKE>` pour utilisateur
- `<@&SNOWFLAKE>` pour rôle
- `@everyone` / `@here` littéral

Ces wire formats sont conservés pour la compatibilité avec le moteur Markdown, le trigger SQL et l'historique des messages.

### 4. Réutilisation dans les autres composers

Vérifier et mettre à jour si nécessaire :
- `src/components/threads/ThreadView.tsx`
- `src/components/channels/announcement/AnnouncementComposer.tsx`
- `src/components/dm/DMConversation.tsx`

Si ces composers utilisent `MessageInput.tsx` directement → rien à faire (héritage automatique). Sinon, propager la même logique de détection `@` unifié.

### 5. Aucun changement nécessaire

- `src/lib/markdown.tsx` — le rendu lit toujours `<@&...>` correctement
- `src/components/chat/InputMarkdownOverlay.tsx` — overlay préserve le rendu wire format
- `supabase/migrations/...` — trigger SQL inchangé
- `src/constants/permissions.ts` — permission `mention_everyone` toujours active

## Détails techniques

- **Conflit de filtre** : si un utilisateur s'appelle `everyone`, il apparaît dans la section Membres ; le rôle global `@everyone` reste dans la section Rôles. Pas de collision puisque les sections sont distinctes.
- **Navigation clavier** : un index global `[0..members.length + rolesAndGlobal.length - 1]` ; la sélection visuelle suit l'ordre d'affichage (membres en premier, puis séparateur, puis rôles).
- **Séparateur** : composant `<Separator />` shadcn déjà disponible dans `src/components/ui/separator.tsx`.
- **Limite d'affichage** : 10 utilisateurs max + 8 rôles max (comme aujourd'hui), `@everyone`/`@here` toujours en tête de la section rôle.
- **Backward compat** : les anciens messages contenant `@&...` saisis manuellement avant ce changement restent valides (le trigger `@&` n'est plus suggéré mais le wire format `<@&SNOWFLAKE>` continue d'être rendu correctement).

## Fichiers modifiés

- `src/components/chat/MessageInput.tsx` — suppression du trigger `@&`, unification sous `@`
- `src/components/chat/MentionAutocomplete.tsx` — fusion des sections user/role + séparateur
- (potentiellement) `src/components/threads/ThreadView.tsx` et autres composers si logique de détection dupliquée

## Garantie de non-régression

- Wire format `<@&SNOWFLAKE>` préservé en base et au rendu
- Trigger SQL `detect_and_insert_mentions` inchangé
- Permission `mention_everyone` toujours respectée
- Popup d'avertissement `MentionEveryoneWarningModal` inchangée
- Mentions de salons (`#`) inchangées
- Aucune migration SQL nécessaire

