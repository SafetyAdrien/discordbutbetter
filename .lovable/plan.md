

# Corrections : hover threads, reply, mentions profils

## 4 problemes identifies

### 1. Hover sur ThreadSystemMessage
Le `ThreadSystemMessage` utilise `bg-surface-elevated` en permanence. Au hover il n'y a pas de changement visuel distinct. Il faut ajouter un hover style comme `hover:bg-surface-hover`.

**Fichier** : `src/components/threads/ThreadSystemMessage.tsx` (ligne 29)
- Remplacer `bg-surface-elevated` par `bg-surface-elevated hover:bg-surface-hover/70`

### 2. Hover sur les messages dans ThreadView
Les messages dans ThreadView utilisent `message-hover` (ligne 731) qui est defini dans index.css. Si ca ne fonctionne pas visuellement, c'est coherent avec le ChatArea. Verifier que le probleme est bien la — sinon rien a corriger.

### 3. Reply non fonctionnel dans ThreadView
Lignes 708 et 743 : `onReply={() => console.log('Reply to', message.id)}` — c'est un simple `console.log`, jamais implemente.

**Solution** : Ajouter un systeme de reply dans ThreadView similaire a ChatArea :
- Ajouter un state `replyingTo` dans ThreadView
- Quand on clique "Repondre", stocker le message dans `replyingTo`
- Afficher un `ReplyReference` au-dessus du `MessageInput`
- Prependre le contenu de la reponse (citation) au message envoye
- Importer `ReplyReference` depuis ChatArea ou le dupliquer

**Fichier** : `src/components/threads/ThreadView.tsx`
- Ajouter state `replyingTo`
- Modifier les callbacks `onReply` pour appeler `setReplyingTo`
- Afficher `ReplyReference` avant le `MessageInput`
- Modifier `handleSend` pour prependre la citation

### 4. Mentions "@Utilisateur inconnu" dans les bios/profils
Le `markdownContext` est defini uniquement dans `ChatArea.tsx` et `AnnouncementChannel.tsx`. Quand `parseMarkdown` est appele dans les profils (`UserProfilePopup`, `FullUserProfileModal`, `DMUserInfoPanel`, etc.), le contexte n'a pas les donnees utilisateurs → affiche "Utilisateur inconnu".

**Solution** : Passer un `MarkdownContext` dans les composants de profil, ou mieux, ajouter un prop `context` optionnel a `MarkdownText`/`parseMarkdown`. Alternativement, on peut enrichir le contexte global avant le rendu des bios.

Approche pragmatique : le contexte global `markdownContext` est un singleton. Il est deja defini quand on est dans un serveur (via ChatArea). Le probleme survient si le profil est ouvert avant qu'un salon ne soit charge. Solution : s'assurer que `setMarkdownContext` est aussi appele dans les composants parents (Index.tsx ou preloader).

### 5. Couleur des mentions dans les bios (bleues au lieu du style chat)
Les mentions dans les profils utilisent le meme composant `UserMention` avec le style chat (violet/or). Dans les bios, elles doivent etre **bleues**.

**Solution** : Ajouter une prop `variant` au composant `UserMention` (et potentiellement `RoleMention`, `ChannelMention`) avec deux variantes : `'chat'` (defaut, style actuel) et `'bio'` (style bleu simple).

**Fichier** : `src/components/chat/mentions/MentionComponents.tsx`
- `UserMention` : ajouter prop `variant?: 'chat' | 'bio'`
- En mode `bio` : `bg-transparent text-[#00AFF4] hover:underline` (bleu Discord)

**Fichier** : `src/lib/markdown.tsx`
- Ajouter un champ `variant?: 'chat' | 'bio'` au `MarkdownContext`
- Passer le variant aux composants de mention lors du rendu

**Fichiers profil** : `UserProfilePopup.tsx`, `FullUserProfileModal.tsx`, `DMUserInfoPanel.tsx`, `ProfileSettingsTab.tsx`
- Avant d'appeler `parseMarkdown(bio)`, appeler `setMarkdownContext({ ...existingContext, variant: 'bio' })` ou utiliser une approche plus propre avec un wrapper.

## Resume des fichiers modifies

| Fichier | Modification |
|---|---|
| `ThreadSystemMessage.tsx` | Ajouter hover style |
| `ThreadView.tsx` | Implementer reply (state + UI + logique) |
| `MentionComponents.tsx` | Ajouter prop `variant` pour style bleu en bio |
| `markdown.tsx` | Ajouter `variant` au contexte, passer aux mentions |
| Fichiers profil (5) | Definir le contexte markdown avec `variant: 'bio'` avant rendu bio |

