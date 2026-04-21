

# Refonte du système de réponse — Discord-like fidèle

Passer d'un parsing fragile basé sur une citation markdown (`> **Author:** ...`) à un **vrai lien de réponse en base** (`reply_to_id`), permettant de résoudre fidèlement le **profil utilisateur** cité (avatar exact, pseudo serveur, couleur de rôle, badges) et de garantir un **saut au message** précis.

## Ce que l'utilisateur verra

### Ligne de réponse au-dessus du message — style Discord exact

```text
   ↪ [avatar] @Adrien_Sama  Message original tronqué…
[Avatar 40] Adrien_Sama  •  8:54
            Mon message de réponse.
```

- **Connecteur courbe** ┌─ partant du centre de l'avatar principal vers la mini-ligne
- **Mini-avatar 16×16** = **vrai avatar du message original** (résolu via `reply_to_id`), pas une initiale générique
- **Pseudo** = **server profile** si en serveur (nickname + couleur de rôle la plus haute), sinon `display_name`, sinon `username`
- **Préfixe `@`** + couleur du rôle (ex. Adrien_Sama bleu si rôle bleu)
- **Aperçu** = **vrai contenu** du message cité (plus de troncature côté envoi : on a la source) — limité à 64 caractères avec **fade-out CSS** (pas d'ellipsis), tooltip au survol pour le contenu complet
- **Indicateur média** si le message original n'a pas de texte mais des pièces jointes : `📎 Image` / `📎 Vidéo` / `📎 Fichier` / `📎 N pièces jointes`
- **Sondage** : `📊 {question du sondage}`
- **Tap/clic** → scroll précis vers `reply_to_id` + highlight pulsant 1.5s (mécanisme `messageRefs` existant)
- **Message supprimé** : `Message original supprimé` en italique, avatar gris, non cliquable

### Au-dessus de l'input (`ReplyReference`)
- Même mini-avatar + même couleur de rôle + même contenu réel
- Bouton ✕ pour annuler — inchangé fonctionnellement

### Migration douce
- Les **anciens messages** stockés au format `> **Author:** ...\n\n{body}` continuent d'être rendus correctement (fallback parsing existant), mais sans avatar fidèle ni jump précis
- Les **nouveaux messages** envoyés avec un reply utilisent `reply_to_id` → expérience pleine

## Détails techniques

### 1. Migration DB
```sql
ALTER TABLE public.messages
  ADD COLUMN reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE INDEX idx_messages_reply_to_id ON public.messages(reply_to_id);
```
- `ON DELETE SET NULL` → la suppression du message original transforme la réponse en "Message original supprimé"
- Pas de RLS additionnelle (hérite de `messages`)

### 2. Hook `useMessages`
- Étendre la sélection : `reply_to_id`
- Ajouter une 2e requête (ou inclusion via une seconde fetch ciblée par IDs) qui charge les messages référencés **avec leur auteur** :
  ```ts
  const replyIds = [...new Set(messages.map(m => m.reply_to_id).filter(Boolean))];
  // SELECT id, content, attachments, author:profiles(...) FROM messages WHERE id IN (replyIds)
  ```
- Construire une `Map<messageId, RepliedMessage>` injectée dans le contexte de rendu
- Un message référencé qui n'existe plus (NULL retour) → marqué `deleted: true`

### 3. Résolution du profil cité (fidélité maximale)
Hook utilitaire `useReplyAuthorProfile(authorId, serverId)` qui combine :
1. **`useMembers(serverId)`** → priorité au `server_profile` (nickname + avatar serveur)
2. **`useRoles(serverId)` + member.roles** → calcule la couleur du rôle le plus haut
3. Fallback : `profiles` global déjà joint dans le message référencé

### 4. Envoi
`ChatArea.handleSend` :
- Avant : préfixe `> **${name}:** ${preview}\n\n${input}`
- Après : envoie `content = messageInput` + ajoute `reply_to_id: replyingTo.id` à l'INSERT
- Mutation `useSendMessage` accepte `replyToId?: string`

### 5. Composant `RepliedLine` — refactor
**Nouvelle prop principale** : `repliedMessage: RepliedMessage | null` (résolue via `reply_to_id`).
- Si présente → utilise avatar exact, content exact, jump exact via `id`
- Préview : si `content` vide et `attachments.length > 0`, formate `📎 ${type}` / `📎 ${count} pièces jointes`
- Si poll détecté (futur) → `📊 ...`
- Pseudo coloré via `authorColor` injecté par le parent (calculé depuis les rôles serveur)
- Préfixe `@` + couleur (Discord-like)
- Connecteur SVG : conservé

**Fallback legacy** : si `reply_to_id` est null mais que le contenu match l'ancien pattern `> **X:** ...`, garder le rendu actuel (best-effort).

### 6. `ReplyReference` (input preview)
- Même refactor : utilise `replyingTo.author` directement (déjà disponible avec avatar) + applique `useReplyAuthorProfile` pour la couleur

### 7. Fichiers
**Migration**
- Nouveau fichier `supabase/migrations/{ts}_add_reply_to_id_to_messages.sql`

**Modifiés**
- `src/hooks/useMessages.ts` — ajouter `reply_to_id`, charger les `repliedMessages`, exposer la map
- `src/hooks/useDMMessages.ts` — même traitement (DMs supportent aussi les replies)
- `src/components/chat/ChatArea.tsx` — passer `repliedMessage` à `RepliedLine`, retirer la concaténation markdown à l'envoi, utiliser `useReplyAuthorProfile`
- `src/components/dm/DMConversation.tsx` & `src/components/mobile/dm/MobileDMConversation.tsx` — idem
- `src/components/mobile/dm/MobileMessageBubble.tsx` — idem
- `src/components/chat/RepliedLine.tsx` — pivote sur `repliedMessage`, ajoute formattage attachments + couleur de rôle + préfixe `@`
- `src/lib/parse-reply.ts` — conservé pour fallback legacy uniquement

### 8. Edge cases
- **Suppression** : `ON DELETE SET NULL` + état "Message supprimé" rendu
- **Édition du message original** : la réponse affiche automatiquement le nouveau contenu (toujours fetché par ID) — fidèle à Discord
- **Réponse cross-channel** : non autorisée (le INSERT vérifie côté UI que `reply_to_id` appartient au même `channel_id`)
- **Threads** : inchangé (cf. memory `mem://features/threads/reply-logic-simulated` — citation simulée préservée à l'intérieur des fils)

### 9. Performance
- Les replies sont batché en une seule requête `IN (...)` après le fetch principal
- Mis en cache via React Query (`['messages', channelId, 'replied']`)
- Aucune requête supplémentaire au render

### 10. Accessibilité
- Inchangé : aria-label complet, focus-visible, tooltip pour contenu long, contraste AA

**Migration DB requise.**

