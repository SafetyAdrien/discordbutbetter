

# Remplacer le message système thread par un embed riche avec spine

## Problème

Le message système `[SYSTEM:THREAD_CREATED]` est actuellement rendu comme une simple ligne de texte centrée. L'utilisateur veut retrouver le composant riche `ThreadSystemMessage` (nom du thread, nombre de messages, aperçu du dernier message, avatars des participants) connecté au message système par une ligne visuelle (spine), comme montré dans la capture Discord.

## Plan

### `src/components/chat/ChatArea.tsx` — Bloc de rendu du message système thread (lignes 1266-1293)

Remplacer le rendu actuel (ligne de texte centrée) par :

1. **Ligne texte système** : garder `"Adrien_Sama a créé un thread : Test"` avec l'icône thread et le timestamp
2. **Embed ThreadSystemMessage** : sous cette ligne, afficher le composant `ThreadSystemMessage` existant (qui montre nom, nombre de messages, avatar participants, aperçu du dernier message)
3. **Spine visuelle** : utiliser une ligne verticale + courbe reliant le texte système au conteneur embed, similaire au `ThreadSpine` existant

Pour obtenir les données du thread (message_count, participants, last_message), il faut :
- Chercher le thread dans `threadsByMessageId` ou dans la liste `threads` via le `threadId` extrait du message système
- Si le thread n'est pas encore chargé (juste créé), afficher un état minimal (nom + "0 Messages")

### Structure du rendu

```
┌─ [icône thread] Adrien_Sama a créé un thread : Test.    timestamp
│
└── ┌──────────────────────────────────────────────┐
    │ Test  1 Message ›                            │
    │ 🟣 Adrien_Sama  ⚔ HYTL  Test  1m ago       │
    └──────────────────────────────────────────────┘
```

- La spine : une ligne verticale partant du niveau de l'icône thread, descendant puis tournant (border-bottom-left-radius) vers le conteneur embed
- Le conteneur embed = `ThreadSystemMessage` avec `bg-surface-elevated`, cliquable pour ouvrir le thread

### Données thread

Créer un `Map<string, Thread>` indexé par `thread.id` (en plus du `threadsByMessageId` existant) pour pouvoir retrouver le thread par son ID extrait du message système. Ce map existe déjà implicitement via le tableau `threads` — il suffit de créer `threadsById` à partir de `threads`.

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/components/chat/ChatArea.tsx` | Remplacer le rendu texte par embed `ThreadSystemMessage` + spine, créer `threadsById` map |

