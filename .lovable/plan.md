

## Objectif

Supprimer le doublon `@everyone` dans le dropdown de mention. Actuellement deux entrées `@everyone` apparaissent :
- 🔵 **Bleu** en haut : mention spéciale synthétique (id `"everyone"`)
- 🟡 **Jaune** en bas : le rôle par défaut du serveur (`is_default: true`, nommé "everyone")

Une seule entrée doit subsister : la **bleue** (qui représente conceptuellement le rôle par défaut du serveur).

## Comportement final

Le rôle par défaut du serveur (`is_default = true`) est **filtré** de la liste des rôles passée à `MentionAutocomplete`. La mention `@everyone` n'apparaît donc qu'**une seule fois** dans le dropdown, en tête de la section "Rôles & Mentions globales", avec le style bleu existant.

Aucun changement sur :
- La gestion des rôles dans les paramètres du serveur (le rôle par défaut reste visible et configurable)
- Le wire format (`@everyone` littéral, inchangé)
- La logique SQL (trigger `detect_and_insert_mentions` inchangé)
- La permission `mention_everyone` (inchangée)
- La popup d'avertissement (inchangée)

## Modifications

### `src/components/chat/MessageInput.tsx`

Filtrer le rôle par défaut **avant** de le passer à `MentionAutocomplete` :

```ts
const mentionableRoles = useMemo(
  () => roles.filter((r) => !r.is_default),
  [roles]
);
```

Puis utiliser `mentionableRoles` au lieu de `roles` dans le prop `<MentionAutocomplete roles={mentionableRoles} />` (ligne 617).

Le prop `roles` passé à `InputMarkdownOverlay` (ligne 636) reste **inchangé** pour préserver le rendu correct des mentions de rôle déjà tapées dans le message.

### Vérification du type `MentionRole`

Le type actuel `MentionRole` (`{ id, name, color }`) n'expose pas `is_default`. Deux options :
1. Étendre `MentionRole` avec un champ optionnel `isDefault?: boolean`
2. Filtrer en amont (côté `MessageInput`) avant de mapper les rôles vers `MentionRole`

→ Option 2 retenue : plus simple, pas d'impact sur le composant `MentionAutocomplete`.

Le hook `useServerRoles` retourne déjà `is_default` dans `RoleWithPermissions`, donc le filtre est trivial à appliquer côté composer.

### Réutilisation dans les autres composers

Appliquer le même filtre dans tout endroit qui passe `roles` à `MentionAutocomplete` :
- `src/components/threads/ThreadView.tsx` (si applicable)
- `src/components/channels/announcement/AnnouncementComposer.tsx` (si applicable)

À vérifier lors de l'implémentation — si ces composers utilisent `MessageInput` directement, aucune action supplémentaire.

## Fichiers modifiés

- `src/components/chat/MessageInput.tsx` — filtrage du rôle `is_default` avant passage à `MentionAutocomplete`
- (potentiellement) autres composers si filtrage dupliqué nécessaire

## Garantie de non-régression

- Le rôle par défaut reste pleinement fonctionnel dans les paramètres serveur
- Le rendu Markdown des mentions existantes reste correct (overlay reçoit toujours tous les rôles)
- La mention `@everyone` (bleu) continue d'envoyer le wire format `@everyone` littéral
- Aucune migration SQL nécessaire
- Aucun changement de permission

