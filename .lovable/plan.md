

## Objectif

Lorsqu'un message contient une **mention qui concerne l'utilisateur courant** (mention directe `<@MOI>`, mention d'un de ses rôles `<@&ROLE>`, ou mention globale `@everyone` / `@here`), styliser le message entier comme dans Discord :

- **Bordure gauche jaune** (4 px) couleur `#faa61a`
- **Fond jaune teinté** à environ **30 % d'opacité** (`rgba(250, 166, 26, 0.10-0.15)`) couvrant toute la zone du message
- Effet **persistant** (pas seulement au survol)

## Comportement final

```
┃ Adrien_Sama 00:09
┃ @everyone Salut !       ← bordure gauche jaune + fond jaune translucide
```

| Type de mention | Concerné si | Styling appliqué |
|---|---|---|
| `<@MON_SNOWFLAKE>` | Toujours pour moi | Oui |
| `<@&ROLE_SNOWFLAKE>` | Si je possède ce rôle | Oui |
| `@everyone` (littéral) | Toujours | Oui |
| `@here` (littéral) | Toujours | Oui |
| Autres mentions | Pour les autres | Non — rendu normal |

## Modifications

### 1. Nouveau utilitaire : `src/lib/mention-detection.ts`

Fonction pure `messageMentionsMe(content, currentUserId, currentUserRoleIds)` qui retourne `true` si :

```ts
import { uuidToSnowflake } from './snowflake';

export function messageMentionsMe(
  content: string,
  currentUserId: string | undefined,
  currentUserRoleIds: string[] = []
): boolean {
  if (!content) return false;
  
  // @everyone / @here (literals)
  if (/(?:^|\s)@(everyone|here)(?:\s|$|[.,!?])/.test(content)) return true;
  
  if (!currentUserId) return false;
  
  // User mention: <@SNOWFLAKE> or <@!SNOWFLAKE>
  const mySnowflake = uuidToSnowflake(currentUserId);
  const userMentionRegex = new RegExp(`<@!?(${currentUserId}|${mySnowflake})>`, 'i');
  if (userMentionRegex.test(content)) return true;
  
  // Role mention: <@&ROLE_SNOWFLAKE>
  for (const roleId of currentUserRoleIds) {
    const roleSnowflake = uuidToSnowflake(roleId);
    const roleRegex = new RegExp(`<@&(${roleId}|${roleSnowflake})>`, 'i');
    if (roleRegex.test(content)) return true;
  }
  
  return false;
}
```

### 2. Nouvelle classe CSS dans `src/index.css`

Ajouter sous `.message-hover` :

```css
.message-mentioned {
  background: rgba(250, 166, 26, 0.10);
  box-shadow: inset 2px 0 0 0 #faa61a;
}

.message-mentioned:hover {
  background: rgba(250, 166, 26, 0.15);
  box-shadow: inset 2px 0 0 0 #faa61a;
}
```

Le `inset 2px 0 0 0` agit comme une bordure gauche sans modifier la largeur réelle, restant compatible avec le `box-shadow` du hover existant (les angles droits sont préservés).

### 3. Application dans les composers

**`src/components/chat/ChatArea.tsx`** :

- Récupérer `currentUserRoleIds` depuis `memberRoles?.get(user.id)` (déjà disponible dans le composant)
- Pour chaque message rendu (lignes ~1115, ~1256, ~1433), calculer `const isMentioningMe = messageMentionsMe(message.content, user?.id, currentUserRoleIds)` et conditionnellement ajouter la classe :

```tsx
className={cn(
  "group/message group message-hover px-4 pb-1 mb-1 relative",
  showAuthor ? "pt-1.5" : "py-0.5",
  isMentioningMe && "message-mentioned",
)}
```

**`src/components/threads/ThreadView.tsx`** (ligne ~777) — même logique.

**`src/components/channels/AnnouncementChannel.tsx`** (ligne ~759) — même logique.

**`src/components/dm/DMConversation.tsx`** (ligne ~436) — pour les DM, seules les mentions utilisateur directes comptent (pas de rôles, pas de `@everyone` dans une DM 1-1, mais on applique la même fonction par cohérence).

### 4. Récupération des rôles utilisateur

Dans `ChatArea.tsx`, le hook `useMembers` retourne déjà `memberRoles` (Map<userId, Role[]>). Ajouter en haut du composant :

```ts
const currentUserRoleIds = useMemo(
  () => (user ? memberRoles?.get(user.id)?.map(r => r.id) ?? [] : []),
  [memberRoles, user]
);
```

Idem dans `ThreadView` et `AnnouncementChannel`.

## Détails techniques

- **Pas de migration SQL** — purement client-side, basé sur le contenu du message déjà chargé
- **Pas de changement du moteur Markdown** — `src/lib/markdown.tsx` continue de rendre les pastilles colorées des mentions individuelles
- **Performance** : la détection est O(n) sur le nombre de rôles de l'utilisateur courant (généralement < 10), exécutée une fois par rendu de message via `useMemo`/calcul direct
- **Compatibilité** : fonctionne avec UUID et Snowflake (regex couvre les deux formats)
- **Préserve les angles droits** : on utilise `box-shadow` (pas de `border-left`) pour ne pas décaler le contenu et rester cohérent avec la suppression du `border-radius` faite précédemment
- **Self-mention déjà visible** : la pastille `@MonNom` reste stylisée en jaune (déjà en place dans `UserMention`)

## Garantie de non-régression

- Aucun changement sur le rendu Markdown, les attachments, polls, reactions
- Les messages **sans** mention de l'utilisateur courant restent strictement identiques (hover normal)
- Le hover normal reste fonctionnel et superposé au style "mentionné"
- Aucun impact sur les notifications/compteurs (séparés via `channel_mentions`)
- Mobile : la classe `.message-mentioned` reste persistante (le `:hover` mobile désactivé n'affecte que le hover normal)

## Fichiers modifiés

- `src/lib/mention-detection.ts` — **nouveau** : fonction de détection
- `src/index.css` — ajout des classes `.message-mentioned` et `.message-mentioned:hover`
- `src/components/chat/ChatArea.tsx` — détection + classe conditionnelle (3 emplacements de rendu)
- `src/components/threads/ThreadView.tsx` — idem
- `src/components/channels/AnnouncementChannel.tsx` — idem
- `src/components/dm/DMConversation.tsx` — idem (mentions utilisateur uniquement)

