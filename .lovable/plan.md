

# Système de réponse Discord-like — uniformisation sur toutes les surfaces

## Constat

Le composant `RepliedLine` (ChatArea, DM, MobileMessageBubble, Annonces, Médias) produit déjà le rendu attendu : flèche + mini-avatar + `@auteur` (couleur de rôle) + aperçu, sur une ligne fine avec un connecteur en "L". **Mais 3 problèmes empêchent la cohérence :**

1. **Threads (`ThreadView`)** : le contenu est rendu brut via `MarkdownText`, donc la citation `> **Auteur** : preview` apparaît comme un bloc Markdown (gros barre verticale grise), pas comme la ligne de réponse Discord.
2. **`parseRepliedMessage`** exige `\n\n` (double saut) entre la citation et le corps, alors que `ThreadView` n'écrit qu'un seul `\n`. Le parser échouerait même si appelé.
3. **Pas de pastille de rôle** (icône à droite du `@auteur`) dans `RepliedLine`, alors que la capture de référence la montre clairement (pastille `HYTL` à droite du pseudo).

## Correctifs

### 1. `src/lib/parse-reply.ts` — Tolérance au saut de ligne simple
Étendre la regex pour accepter `\n` ou `\n\n` après la citation :  
`/^>\s\*\*([^:*\n]+?)\*\*\s*[:：]\s([^\n]+)\n+([\s\S]+)$/`  
Cela couvre le format produit par `ThreadView` (`> **Author** : preview\nbody`) et l'ancien format ChatArea (`\n\n`).

### 2. `src/components/chat/RepliedLine.tsx` — Ajout pastille de rôle
Nouvelle prop optionnelle `authorRoleIcon?: { iconUrl: string; name: string; color?: string | null }`.  
Quand fournie, rendre `<RoleBadgePopover>` (taille mini : `w-3.5 h-3.5`) juste après le `@auteur`. Le composant existant `RoleBadgePopover` est réutilisé tel quel — seule la taille de l'icône est réduite via une variante prop ou wrapper inline.

### 3. `src/components/threads/ThreadView.tsx` — Rendu Discord-like des réponses
Au lieu de rendre `<MarkdownText content={message.content} />` directement (ligne 886), introduire :
```ts
const { reply, body } = parseRepliedMessage(message.content);
```
Puis :
- Si `reply` détecté : afficher `<RepliedLine authorName={reply.author} preview={reply.preview} messages={items.filter(i => i.type==='message').map(i => i.data)} onJump={…} indent={32} authorColor={…} authorRoleIcon={…} />` au-dessus du `MarkdownText content={body}`.
- Sinon : conserver le rendu actuel.
La résolution de la couleur/badge passe par la map `memberRoles` déjà disponible dans `ThreadView`, en cherchant l'auteur cité par `display_name` dans `membersData`.

### 4. `src/components/chat/ChatArea.tsx` — Brancher la pastille de rôle
Aux deux emplacements existants de `<RepliedLine>` (lignes 1634 et 1772), ajouter `authorRoleIcon` calculé via `memberRoles.get(message.repliedMessage?.author?.id)?.[0]` lorsqu'`icon_url` existe.

### 5. `src/components/dm/DMConversation.tsx` & `src/components/mobile/dm/MobileMessageBubble.tsx`
Pas de pastille de rôle en DM (les rôles n'existent pas hors serveur). Aucune modification fonctionnelle, sauf vérifier que `indent` reste cohérent avec l'avatar du bubble.

### 6. `src/components/channels/announcement/AnnouncementComments.tsx` & `src/components/channels/media/MediaComments.tsx`
Brancher `authorRoleIcon` de la même façon que ChatArea quand l'auteur cité est membre du serveur courant (`memberRoles` accessible via `useMembers`).

## Résultat attendu

- **Threads** : la citation apparaît désormais comme la ligne fine Discord-like (flèche + mini-avatar + `@pseudo` coloré + aperçu), strictement identique à ChatArea/DM/Mobile.
- **ChatArea, Annonces, Médias** : la pastille de rôle (icône d'icon_url) s'affiche à droite du `@pseudo` cité, exactement comme dans la capture de référence.
- **Mobile (DM bubbles + chat serveur)** : déjà conforme, juste vérification d'alignement.
- **Format texte stocké** : compatible avec et sans double saut de ligne — aucune migration de données nécessaire.

## Détails techniques

- Aucune modification de schéma DB. Le système `reply_to_id` (snapshots `repliedMessage`) reste prioritaire ; le parsing markdown est le fallback historique étendu aux threads.
- `RoleBadgePopover` réutilisé tel quel ; un wrapper `className` ajustera la taille pour l'usage compact.
- Touche-aucun fichier auto-géré (`types.ts`, `client.ts`, `.env`).
