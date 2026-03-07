

# Fix: Éviter la duplication des threads dans les messages système

## Problème

Quand un thread est créé sur un message, il apparaît **deux fois** dans le chat :
1. Via le **message système** `[SYSTEM:THREAD_CREATED:...]` → affiche le spine + embed `ThreadSystemMessage`
2. Via `threadsByMessageId` sous le **message parent** → affiche un second `ThreadSystemMessage`

Les deux pointent vers le même thread.

## Solution

### `src/components/chat/ChatArea.tsx`

Modifier le `useMemo` de `threadsByMessageId` (ligne 702) pour **exclure** les threads qui ont déjà un message système visible dans la liste des messages. Concrètement :

```tsx
const threadsByMessageId = useMemo(() => {
  // Collect thread IDs that already have a system message rendered
  const systemThreadIds = new Set<string>();
  messages.forEach((msg) => {
    if (msg.is_system && msg.content.startsWith('[SYSTEM:THREAD_CREATED:')) {
      const match = msg.content.match(/\[SYSTEM:THREAD_CREATED:([^:]+):/);
      if (match) systemThreadIds.add(match[1]);
    }
  });

  const map = new Map<string, Thread>();
  threads.forEach((thread) => {
    if (thread.message_id && !systemThreadIds.has(thread.id)) {
      map.set(thread.message_id, thread);
    }
  });
  return map;
}, [threads, messages]);
```

Un seul fichier modifié, ~10 lignes changées.

