

# Correctifs : Bouton Suivre, RÉPONSES Desktop, Sync Mobile→PC, Densité messages

## 1. Bouton "Suivre" Annonces — visibilité élargie

### A. Header du salon Annonces (`AnnouncementChannel.tsx` ligne 445)
- **Retirer le gating `canFollowAnnouncements`** sur le bouton "Suivre" du header.
- Le bouton devient visible pour **TOUS les membres** du serveur courant qui peuvent voir le salon (pas seulement les admins/permission `follow_announcements`).
- La permission `follow_announcements` reste vérifiée **dans `FollowChannelModal`** côté serveur cible (où l'utilisateur ajoute le suivi sur SON serveur), ce qui est sémantiquement correct.

### B. Barre "Suivre" dans le composer (`MessageInput.tsx` lignes 558-575)
- Vérifier que `showFollowBar` est bien transmis dans `AnnouncementChannel.tsx` ligne 1124 → c'est déjà le cas (`!canSendMessages && !permissionDeniedMessage`). 
- **Aucune régression à corriger** ici, elle s'affiche déjà quand l'utilisateur ne peut pas écrire.
- S'assurer que le rendu via `AnnouncementComposer` (lignes 217-227) est cohérent : le `showFollowBar` y déclenche bien le bouton "Suivre #salon pour recevoir les annonces" — déjà OK.

### C. Sheet mobile (`MobileChatView.tsx` ligne 166)
- **Retirer le gating `canFollowAnnouncements`** sur l'entrée "Suivre cette annonce" du menu More : visible pour tous les membres en lecture du salon.

## 2. RÉPONSES — bug Desktop/Tablette + alignement vertical

### Constat
Sur Desktop (`ChatArea.tsx` ligne 1500) : `RepliedLine` est rendu **uniquement quand `showAuthor=true`**. Or `hasReply` force `showAuthor=true`, donc la ligne s'affiche. Cependant le **connecteur SVG `top: 14`** est désaligné par rapport à l'avatar de 40px qui suit (la pointe basse du L tombe au milieu, pas au centre vertical de l'avatar).

Pour `ThreadView.tsx` (ligne 817) et `DMConversation.tsx` (ligne 438) la même logique s'applique avec des avatars 32px.

### Correctif `RepliedLine.tsx`
- **Repenser le tracé du L** pour qu'il soit visuellement **centré sur la moitié supérieure de l'avatar du dessous** :
  - SVG positionné : `top: 9` (au lieu de 14) pour que la base verticale du L démarre plus bas et tombe pile au centre vertical du mini-avatar (16px) ET arrive **face au centre horizontal de l'avatar principal** en dessous (20px depuis la gauche pour avatar 40px, 16px pour avatar 32px).
  - `connectorLeft = indent - 36` → ajuster à `indent - 38` pour centrer sur l'axe vertical de l'avatar parent (20px sur 40px d'avatar).
  - Tracé : `M 1 28 L 1 10 Q 1 2 9 2 L ${connectorWidth} 2` — la ligne descend plus bas et son origine bas-gauche tombe au **centre vertical** de l'avatar de 40px (qui commence ~ligne 22 et fait 40px).

### Correctif spacing au-dessus de RepliedLine
- `ChatArea.tsx` ligne 1500 : conserver `pt-2` quand `hasReply`, mais sur le `RepliedLine` : ajuster `className="mb-1"` → `className="mb-0.5"` pour ne pas créer un double-gap avec `mt-0.5` de l'avatar.
- `DMConversation.tsx` ligne 437 : passer le wrapper `<div className="-mb-0.5">` → `<div className="mb-0.5 mt-1">`.
- `ThreadView.tsx` ligne 824 : `className="mb-0.5"` (déjà correct).

## 3. Sync Mobile→PC : Système de réponses citées

### Constat
Sur **Mobile DM** (`MobileMessageBubble.tsx` ligne 223) le `RepliedLine` est rendu au-dessus de la bulle. Sur **Desktop DM** (`DMConversation.tsx` ligne 436) il est aussi rendu, mais sa résolution est **incomplète** : il ne passe ni `authorColor` ni `authorRole` (pas de couleur de pseudo, pas de badge de rôle pour DM groupe).

### Correctifs
- **`DMConversation.tsx`** (ligne 436-462) :
  - Ajouter la résolution de l'auteur cité via le membre du DM (group DM ou 1:1).
  - Pour les DM 1:1 → pas de rôle, mais pseudo coloré si stocké dans le profil (sinon couleur par défaut).
  - Pour les DM groupe → rechercher le rôle via `groupParticipants`, transmettre `authorColor` + `authorRole`.
- **`ChatArea.tsx`** (ligne 1534) — déjà résolu correctement pour serveurs.
- **`ThreadView.tsx`** (ligne 817) — déjà résolu correctement.
- **`AnnouncementComments.tsx`** (ligne 137) et **`MediaComments.tsx`** (ligne 145) — déjà OK.

### Composer de réponse Desktop (parité mobile)
- Vérifier que `replyingTo` se manifeste par une bannière au-dessus du composer dans **DMConversation Desktop** (déjà présent, vérifier styling identique mobile).
- Sur **`ChatArea.tsx`** : la bannière de réponse au-dessus du composer doit afficher avatar + pseudo + aperçu identique au mobile (probablement déjà OK via `MessageInput`).

## 4. Densité Discord-strict des messages

### Règle universelle (capture image-56)
- **Messages groupés** (même auteur dans les 5min) : `2px` de gap vertical.
- **Nouveau auteur** : `8px` de gap vertical.
- **Avec citation (RepliedLine)** : `10px` de gap au-dessus de la mini-ligne pour aérer.

### Application
- **`ChatArea.tsx`** ligne 1499 — wrapper externe :
  - `mb-1` (4px) → `mb-0` pour supprimer le margin parasite.
  - `pb-1` → `pb-0`.
  - `py-0.5` (2px haut+bas, soit 4px total entre groupés) → `py-px` (1px haut+bas = 2px total).
  - `pt-1.5` (6px) pour nouveau auteur → `pt-2` (8px) pour conformer à Discord.
  - `pt-2` quand `hasReply` → `pt-2.5` (10px) pour aérer la mini-ligne.
- **`ThreadView.tsx`** ligne 833-836 : `py-1` → `py-px` ; ajuster `pt-2` quand `showAuthor`.
- **`DMConversation.tsx`** ligne 384 : conteneur `space-y-0.5` (2px) → `space-y-px` (1px) pour resserrer ; ajouter `pt-2` conditionnel sur le wrapper de chaque message quand `showAuthor`.
- **`AnnouncementComments.tsx`** ligne 123 : `space-y-3` → `space-y-2` pour densifier.
- **`MediaComments.tsx`** : idem `space-y-3` → `space-y-2`.
- **`MobileMessageBubble.tsx`** : déjà compact, pas de changement.

## Résultat attendu

1. Le bouton **"Suivre"** apparaît dans le header du salon Annonces pour TOUS les membres + dans le menu mobile pour TOUS, et la barre de suivi reste visible quand l'utilisateur ne peut pas écrire.
2. Le **système de réponse fonctionne sur Desktop et Tablette** (ChatArea, DM, Threads), avec le connecteur en L **visuellement centré face à l'avatar** du message qui suit (alignement pixel-perfect).
3. Les **citations en DM Desktop** affichent le pseudo coloré et le badge de rôle (group DM), à l'identique du mobile.
4. La **densité des messages est Discord-strict** sur toutes les surfaces : 2px entre groupés, 8px entre auteurs différents, 10px au-dessus d'une mini-ligne de réponse.

## Détails techniques

- Aucun changement DB, aucun fichier auto-généré touché (`types.ts`, `client.ts`, `.env`).
- Ouverture de la permission `follow_announcements` sur le BOUTON uniquement ; la sécurité côté serveur cible reste enforced via le RPC dans le modal.
- Le tracé SVG du L est recalibré pour `indent=56` (avatars 40px, ChatArea/DM) et `indent=44` (avatars 32px, Threads/Comments) — les deux configurations restent valides via le calcul `connectorLeft = indent - 38`.
- Spacing universel via Tailwind tokens (`pt-2`, `pt-2.5`, `py-px`) — pas de magic numbers en style inline.
- Aucune modification de `parseRepliedMessage` ni du schéma `repliedMessage`.

