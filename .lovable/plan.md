

# Reprise complète : Bouton Suivre + RÉPONSES Desktop/Tablette + Sync DM/Server + Densité Discord-strict

## Constat des manques précédents

J'ai laissé en suspens 3 zones critiques :
1. **Le bouton "Suivre"** : seul le header serveur Annonces a été touché — j'ai oublié la barre composer pour les non-rédacteurs ET le menu mobile.
2. **L'alignement RÉPONSES** : le connecteur en L est mal calibré → la pointe basse ne tombe PAS au centre vertical de l'avatar (40px) du message du dessous, et la mini-ligne flotte sans être centrée face à la PP.
3. **La sync Mobile→PC pour les réponses DM** : le `RepliedLine` Desktop ne reçoit ni `authorColor` ni `authorRole` → les pseudos cités dans les DM groupe sont gris sans badge, contrairement à mobile.
4. **La densité Discord-strict** : `py-0.5` (4px) reste appliqué sur ChatArea/Threads/DM au lieu de `py-px` (2px).

## Correctifs

### 1. Bouton "Suivre" — visibilité totale

**`AnnouncementChannel.tsx`** (header, ligne ~445) :
- Retirer la condition `canFollowAnnouncements &&` qui gate le bouton "Suivre" du header. Le bouton devient visible pour TOUS les membres pouvant voir le salon.

**`MobileChatView.tsx`** (More menu, ligne ~166) :
- Retirer `canFollowAnnouncements &&` sur l'entrée "Suivre cette annonce" → visible pour tous.

**Barre composer "Suivre #salon" (`AnnouncementComposer.tsx` + `MessageInput.tsx` `showFollowBar`)** :
- Vérifier que `showFollowBar` se déclenche bien quand `!canSendMessages`. Si dans `AnnouncementChannel.tsx` la prop n'est plus passée (régression), la remettre : `showFollowBar={!canSendMessages && isAnnouncementChannel}`.

La permission `follow_announcements` reste enforced **côté serveur cible** dans `FollowChannelModal` (où l'utilisateur ajoute le suivi sur SON serveur), ce qui est correct.

### 2. RÉPONSES Desktop/Tablette — alignement parfait du L

**`RepliedLine.tsx`** — recalibrage complet du SVG pour que :
- La **base verticale** du L tombe pile au **centre horizontal** de l'avatar parent (20px depuis la gauche pour avatar 40px ChatArea/DM, 16px pour avatar 32px Threads/Comments).
- La **pointe basse** du L atteigne le **centre vertical** de l'avatar parent (≈20px sous la mini-ligne pour un avatar 40px).
- Le **bras horizontal** du L pointe vers le **centre vertical du mini-avatar 16px** de la ligne de réponse.

Calculs :
- `connectorLeft = indent - 36` (centre avatar 40px : 20px depuis le bord gauche du flex + offset).
- SVG : `top: 8`, `height: 26`, `width: connectorWidth`, `overflow: visible`.
- Path : `M 1 26 L 1 9 Q 1 1 9 1 L ${connectorWidth} 1` — descend jusqu'à `y=26` (centre vertical de l'avatar 40px), courbe en haut-gauche, file horizontalement vers le mini-avatar.

**`ChatArea.tsx`** (ligne ~1500) :
- Conserver `pt-2.5` quand `hasReply` (10px d'air au-dessus de la mini-ligne).
- `RepliedLine` : `className="mb-1"` (4px entre mini-ligne et bloc avatar+contenu).
- `indent={56}` reste correct (40 avatar + 12 gap + 4 offset).

**`ThreadView.tsx`** + **`AnnouncementComments.tsx`** + **`MediaComments.tsx`** :
- `indent={44}` (32 avatar + 8 gap + 4 offset).
- `className="mb-1"` sur `RepliedLine`.

**`DMConversation.tsx`** (ligne ~436) :
- `indent={56}` (avatars 40px en DM serveur), `className="mb-1"`.
- Wrapper externe : `pt-2.5` quand `hasReply`.

### 3. Sync Mobile→PC : DM Desktop reçoit la résolution complète

**`DMConversation.tsx`** (RepliedLine ~436-462) :
- Construire un `dmAuthorLookup` à partir des participants du DM (1:1 OU groupe).
- Passer `authorRole={null}` pour les DM (pas de rôles serveur), mais `authorColor` si le profil cité a une couleur d'accent stockée.
- Pour les **DM groupe**, si le membre cité avait un rôle dans un serveur partagé → ne PAS passer le badge (les DM n'affichent jamais les rôles serveur, comportement Discord).
- L'objectif : que le pseudo du `RepliedLine` Desktop affiche le **vrai displayName + vraie couleur** du participant cité, pas un fallback gris.

### 4. Densité Discord-strict — appliquée partout

**Règle universelle** :
- Messages groupés (même auteur < 5min) : **2px** de gap vertical total.
- Nouveau auteur : **8px** de gap vertical.
- Avec citation (RepliedLine au-dessus) : **10px** au-dessus de la mini-ligne.

**`ChatArea.tsx`** wrapper externe (ligne ~1499) :
- `mb-1` → `mb-0`, `pb-1` → `pb-0`, `py-0.5` → `py-px` (2px total).
- `pt-1.5` (nouveau auteur) → `pt-2` (8px).
- `pt-2` (hasReply) → `pt-2.5` (10px).

**`ThreadView.tsx`** (ligne ~833-836) :
- `py-1` → `py-px`, `pt-2` quand `showAuthor`.

**`DMConversation.tsx`** (ligne ~384) :
- `space-y-0.5` → `space-y-px` sur le conteneur de la liste de messages.
- Sur chaque wrapper de message : `pt-2` quand `showAuthor`, `pt-2.5` quand `hasReply`.

**`AnnouncementComments.tsx`** + **`MediaComments.tsx`** :
- `space-y-3` → `space-y-2` pour densifier les commentaires.

**`MobileMessageBubble.tsx`** : déjà compact, pas de changement.

## Résultat attendu

1. **Bouton "Suivre"** visible pour TOUS dans le header Annonces (Desktop + Mobile More menu) + barre composer "Suivre #salon" pour les non-rédacteurs.
2. **Système de réponse fonctionnel sur Desktop/Tablette** (ChatArea, DM Server, DM Groupe, Threads, Comments) avec connecteur en L **pixel-perfect centré** sur la PP de l'avatar du dessous + bras horizontal aligné sur le mini-avatar.
3. **DM Desktop affiche correctement** le pseudo coloré du participant cité (parité mobile).
4. **Densité Discord-strict** : 2px entre groupés / 8px entre auteurs / 10px au-dessus d'une mini-ligne — cohérente partout.

## Détails techniques

- Aucun changement DB, aucun fichier auto-généré touché.
- Le calcul `connectorLeft = indent - 36` fonctionne pour `indent=56` (avatar 40) et `indent=44` (avatar 32) car la gouttière reste alignée sur le centre horizontal de l'avatar parent.
- Aucune modification du regex `parseRepliedMessage` ni du schéma `repliedMessage`.
- Permission `follow_announcements` reste enforced côté serveur cible via le RPC dans `FollowChannelModal` — la sécurité n'est PAS dégradée, seule l'UI s'ouvre à tous.
- Le SVG est `overflow: visible` pour déborder sur la zone de l'avatar du dessous sans casser le flow flex.

