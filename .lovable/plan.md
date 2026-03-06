

# Émettre un message système lors de la création d'un thread public

## Problème

Quand un thread est créé (via un message ou via la liste des threads), aucun message système n'est inséré dans le salon. Le composant `ThreadSystemMessage` ne s'affiche que sous un message parent qui a un thread attaché (via `message_id`), mais il n'y a pas de vrai message en base de données signalant la création.

Le user veut :
- Thread public → message système visible dans le salon
- Thread privé → rien de publié

## Analyse

- La table `messages` n'a pas de colonne `is_system` ou `type` pour distinguer les messages système
- La table `threads` n'a pas de colonne `is_private` pour différencier public/privé
- Il faut ajouter les deux

## Plan

### 1. Migration SQL

**Ajouter `is_system` à `messages`** :
```sql
ALTER TABLE public.messages ADD COLUMN is_system boolean NOT NULL DEFAULT false;
```

**Ajouter `is_private` à `threads`** :
```sql
ALTER TABLE public.threads ADD COLUMN is_private boolean NOT NULL DEFAULT false;
```

RLS : les messages système sont insérés par l'auteur du thread (déjà autorisé par la policy `send_messages`), donc pas de changement RLS nécessaire.

### 2. `src/hooks/useThreads.ts` — `useCreateThread`

Dans `onSuccess` (après insertion réussie du thread), si le thread n'est **pas privé** :
- Insérer un message système dans `messages` avec :
  - `channel_id` = le channel du thread
  - `author_id` = l'utilisateur courant
  - `content` = `[SYSTEM:THREAD_CREATED]` + thread id + thread name (format parsable)
  - `is_system` = `true`
- Invalider le cache `['messages', channelId]`

### 3. `src/components/chat/ChatArea.tsx` — Rendu des messages système

- Ajouter `is_system` au select des messages dans `useMessages.ts`
- Dans `ChatArea.tsx`, détecter les messages avec `is_system === true` et le contenu `[SYSTEM:THREAD_CREATED]`
- Rendre un composant dédié (icône thread + "**Nom** a créé un thread : **Thread Name**") au lieu du rendu message normal
- Style : centré, texte gris, petite taille, comme Discord

### 4. `src/hooks/useMessages.ts` — Select `is_system`

- Ajouter `is_system` dans le select de `queryFn`
- Ajouter `is_system` dans le type `MessageWithAuthor`

### 5. `src/components/threads/CreateThreadModal.tsx`

- Ajouter une option/checkbox "Thread privé" dans le modal de création
- Passer `isPrivate` au hook `useCreateThread`

### 6. Type updates

- `src/types/thread.ts` : ajouter `is_private?: boolean` à `Thread`
- `src/types/app.ts` ou inline : ajouter `is_system?: boolean` à `MessageWithAuthor`

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| Migration SQL | `is_system` sur messages, `is_private` sur threads |
| `src/hooks/useThreads.ts` | Insérer message système après création (si public) |
| `src/hooks/useMessages.ts` | Ajouter `is_system` au select et au type |
| `src/components/chat/ChatArea.tsx` | Rendu spécial pour messages système thread |
| `src/components/threads/CreateThreadModal.tsx` | Option thread privé |
| `src/types/thread.ts` | `is_private` |

