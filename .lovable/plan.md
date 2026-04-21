

# Correction : afficher le profil complet pour les messages-réponses groupés

## Le problème

Dans le flux du chat, quand l'utilisateur **A** envoie un message normal, puis envoie tout de suite après une **réponse** à un autre message, le 2ᵉ message est actuellement *groupé* sous le 1ᵉʳ (sans avatar, sans nom, juste le texte) parce que la logique `showAuthor` ne vérifie que :
1. Auteur identique au message précédent
2. Écart < 5 minutes

Résultat visuel actuel (incorrect) :
```
🟣 Adrien_Sama  •  10:30
   Salut tout le monde !
   ┌─ @Marie  Comment ça va ?
   Très bien merci !          ← réponse "noyée", pas de profil visible
```

Résultat attendu (Discord-like) :
```
🟣 Adrien_Sama  •  10:30
   Salut tout le monde !

   ┌─ @Marie  Comment ça va ?
🟣 Adrien_Sama  •  10:30
   Très bien merci !          ← profil complet réaffiché car c'est une réponse
```

## Ce qui change

**Règle ajoutée** : un message qui contient une **réponse** (`reply_to_id` non nul OU citation legacy parsée) **force toujours `showAuthor = true`**, même si l'auteur et l'horaire correspondraient à un regroupement.

C'est le comportement natif de Discord : chaque réponse démarre son propre bloc avec avatar + pseudo + heure, pour que le contexte de la conversation soit immédiatement lisible.

## Cas couverts (tous corrigés)

| Scénario | Avant | Après |
|---|---|---|
| Message normal → message normal (même auteur, < 5 min) | groupé ✓ | groupé ✓ (inchangé) |
| Message normal → **réponse** (même auteur, < 5 min) | groupé ❌ | profil complet ✅ |
| Réponse → réponse (même auteur, < 5 min) | groupé ❌ | profils complets ✅ |
| Réponse → message normal (même auteur) | groupé ✓ | groupé ✓ (inchangé) |

## Détails techniques

### Fichiers modifiés

**`src/components/chat/ChatArea.tsx`** (ligne ~1474) — étendre la logique `showAuthor` pour la branche des messages :

```ts
const hasReply = Boolean(message.replyToId || message.repliedMessage)
  || Boolean(parseRepliedMessage(message.content).reply);

const showAuthor =
  !prevItem ||
  prevItem.type !== "message" ||
  (prevItem.data as Message).author.id !== message.author.id ||
  item.timestamp.getTime() - prevItem.timestamp.getTime() > 300000 ||
  hasReply;  // ← Nouvelle règle
```

Le `parseRepliedMessage` est déjà importé et utilisé ligne 1481 — on peut soit déplacer l'appel avant le calcul de `showAuthor`, soit utiliser le résultat existant. Choix : déplacer le `parseRepliedMessage` 2 lignes plus haut (avant `showAuthor`) pour réutiliser une seule fois.

**`src/components/dm/DMConversation.tsx`** — appliquer la même règle à la logique de regroupement DM (même pattern `showAuthor` à corriger).

**`src/components/mobile/dm/MobileMessageBubble.tsx`** + **`src/components/mobile/dm/MobileDMConversation.tsx`** — vérifier et étendre la logique de regroupement mobile pour appliquer la même règle (un message-réponse n'est jamais bullé/groupé avec le précédent).

**`src/components/mobile/MobileChatView.tsx`** — appliquer la même règle si une logique de regroupement existe pour le chat mobile serveur.

### Hors scope (non touché)

- `RepliedLine.tsx` : aucun changement, le composant fait son travail correctement
- Threads : la logique de citation simulée reste inchangée (cf. memory `mem://features/threads/reply-logic-simulated`)
- Annonces / Médias : les commentaires n'ont pas de regroupement par auteur, non concerné
- Aucune migration DB, aucun changement de hook

### Performance & accessibilité
- Coût additionnel négligeable : un seul appel `parseRepliedMessage` par message (déjà fait ailleurs dans le render)
- Améliore l'accessibilité : chaque réponse a désormais son propre point d'ancrage avec contexte d'auteur explicite (lecteur d'écran)

