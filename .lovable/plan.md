

## Objectif
Ajouter au menu contextuel des messages :
1. **"Voir les réactions"** → modal avec tabs par emoji + liste des utilisateurs ayant réagi
2. **"Supprimer toutes les réactions"** (raccourci) → réservé aux modérateurs avec permission `manage_expressions`

## Exploration nécessaire

Je dois vérifier :
- La permission `manage_expressions` existe-t-elle dans `server_permission` enum ?
- Comment `UniversalMessageContextMenu` est utilisé dans `ChatArea` (props passées)
- Les hooks de réactions disponibles (`useReactions.ts` + 4 nouveaux : DM, Thread, Media, Comment)

D'après le code visible :
- `useReactions.ts` expose `useRemoveReaction` qui supprime UNIQUEMENT la réaction de l'utilisateur courant (`.eq('user_id', user.id)`)
- Pour le mode modérateur, il faut une nouvelle mutation pouvant supprimer la réaction de N'IMPORTE QUEL utilisateur
- RLS actuelle sur `reactions` : `Users can remove their reactions` → `auth.uid() = user_id` ❌ bloque les modos

## Architecture

### 1. DB / RLS
Ajouter via migration une politique DELETE supplémentaire sur les 5 tables de réactions (`reactions`, `dm_message_reactions`, `thread_message_reactions`, `media_post_reactions`, `announcement_comment_reactions`) :

```sql
-- Pour reactions (server messages)
CREATE POLICY "Moderators can delete any reactions"
ON reactions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM messages m JOIN channels c ON c.id = m.channel_id
    WHERE m.id = reactions.message_id
      AND has_server_permission(auth.uid(), c.server_id, 'manage_expressions'::server_permission)
  )
);
```

Équivalent pour les 4 autres tables (sauf `dm_message_reactions` qui n'a pas de notion de modérateur — on n'ajoute rien là).

Si `manage_expressions` n'existe pas dans l'enum, je le créerai. (À vérifier en début d'implémentation.)

### 2. Nouveaux hooks de modération
Étendre chaque fichier de hook réaction avec :
- `useRemoveAnyReaction(messageId, userId, emoji)` → suppression ciblée d'1 réaction d'1 utilisateur
- `useRemoveAllReactions(messageId)` → suppression en masse pour 1 message

Optimistic updates cohérents avec le pattern existant.

### 3. Nouveau composant `ReactionsViewerModal`
`src/components/chat/ReactionsViewerModal.tsx`

```
┌──────────────────────────────────────┐
│ Réactions                         X  │
├──────────────────────────────────────┤
│ [👍 5] [❤️ 3] [😂 1]  [Tous]        │ ← Tabs par emoji
├──────────────────────────────────────┤
│ ☑ avatar  username       [×]        │ ← × visible si moi OU modo
│ ☑ avatar  username       [×]        │
│ ...                                 │
├──────────────────────────────────────┤
│ [Mode sélection] [Supprimer tout]   │ ← Modo only
└──────────────────────────────────────┘
```

Props :
```ts
{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  messageId: string;
  reactions: Reaction[];
  canModerate: boolean;
  onRemoveOwn: (emoji: string) => void;
  onRemoveAny: (userId: string, emoji: string) => void;
  onRemoveAll: () => void;
}
```

Comportement :
- Tabs = chaque emoji unique + un tab "Tous"
- Liste utilisateurs résolus via `useProfile`/cache de profils
- Bouton × à côté de chaque ligne : si c'est moi → toujours actif ; si modo → actif sur tous
- Mode "checklist" (modo only) : checkboxes apparaissent → bouton "Supprimer la sélection"
- Bouton "Supprimer toutes les réactions" (modo only) → confirm dialog

### 4. Étendre `UniversalMessageContextMenu`
Ajouter 2 props + 2 entrées :

```ts
canManageExpressions?: boolean;
onViewReactions?: () => void;
onRemoveAllReactions?: () => void;
```

Entrées dans le menu (après "Copier l'ID", avant le séparateur destructif) :
- 👁 **Voir les réactions** → `onViewReactions()` (toujours visible si message a ≥ 1 réaction)
- 🗑 **Supprimer toutes les réactions** → `onRemoveAllReactions()` (uniquement si `canManageExpressions`)

Mêmes ajouts dans la version mobile (Sheet).

### 5. Intégration dans `ChatArea`
- Passer `canManageExpressions` (nouveau check via `usePermissions`)
- Gérer l'état d'ouverture du modal (`viewingReactionsFor: messageId | null`)
- Connecter `onRemoveAllReactions` à la nouvelle mutation `useRemoveAllReactions`

### 6. Réplication minimale
Pour respecter le scope sans exploser le PR, j'intègre **uniquement dans `ChatArea`** (messages serveur textuels) en première itération. Les autres surfaces (DM, Thread, Media, Comments) auront le bouton "Voir les réactions" sans modération massive (DM n'a pas de modo, threads/media/comments suivront le même pattern dans les itérations futures si demandé).

## Fichiers

**Migration SQL** : politiques DELETE modérateur sur 4 tables (+ ajout `manage_expressions` si absent).

**Hooks modifiés** :
- `src/hooks/useReactions.ts` — ajouter `useRemoveAnyReaction`, `useRemoveAllReactions`

**Composant créé** :
- `src/components/chat/ReactionsViewerModal.tsx`

**Composants modifiés** :
- `src/components/chat/UniversalMessageContextMenu.tsx` — 2 nouvelles entrées (desktop + mobile)
- `src/components/chat/ChatArea.tsx` — état modal + props + mutations

## Résultat
Clic droit sur un message :
- "Voir les réactions" → modal détaillée avec tabs emoji et liste utilisateurs
- Modos (`manage_expressions`) : checklist + bouton suppression groupée + bouton "Supprimer toutes les réactions" en accès rapide
- Utilisateur normal : peut s'auto-retirer depuis la liste

