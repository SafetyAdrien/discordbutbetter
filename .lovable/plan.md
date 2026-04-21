
# Intégration complète des réponses Desktop/Tablette

## Ce qui est réellement en place aujourd’hui

L’intégration n’est que partielle :

- `ChatArea.tsx` : réponse réellement intégrée avec `reply_to_id` + `repliedMessage` + `RepliedLine`.
- `DMConversation.tsx` : réponse réellement intégrée aussi.
- `AnnouncementChannel.tsx` : pas intégré. Le composer fabrique encore une fausse citation Markdown :
  `> **Auteur:** extrait\n\nmessage`
- `ThreadView.tsx` : pas intégré. Le reply est encore simulé via `parseRepliedMessage(message.content)` et une citation texte.
- `SwipeToReplyRow` : activé uniquement avec `enabled={isMobile}` dans `ChatArea`, `DMConversation`, `ThreadView`. Donc aucune parité tablette/desktop.
- `thread_messages` n’a pas encore de `reply_to_id`, donc un vrai système de réponse thread n’existe pas côté données.

## Plan de correction

### 1. Unifier la règle produit
Appliquer le même vrai système de réponse partout sur Desktop, Tablette et Mobile pour :
- messages serveur classiques
- DMs
- annonces
- threads

Règle cible :
- cliquer “Répondre” ou glisser si supporté -> stocker une vraie cible
- envoyer -> persister un lien réel (`reply_to_id`)
- afficher -> rendre `RepliedLine` au-dessus du bloc message
- saut -> `onJump` vers le message source
- suppression source -> `deleted: true` avec fallback propre

### 2. Corriger le vrai manque : `AnnouncementChannel.tsx`
Remplacer la logique legacy :

- supprimer la concaténation Markdown dans `handleSubmit`
- envoyer `replyToId: replyingTo?.id ?? null` à `sendMessageMutation`
- afficher la réponse au-dessus du message avec `RepliedLine`, comme dans `ChatArea`
- garder la barre de preview au-dessus du composer, mais la brancher sur la vraie cible
- appliquer le même spacing/indent que le chat serveur desktop

Résultat :
- les réponses annonces ne dépendront plus d’un blockquote texte
- le rendu desktop/tablette sera réellement intégré

### 3. Corriger le vrai manque : `ThreadView.tsx`
Le thread n’a actuellement qu’un faux système. Il faut le convertir en vrai système.

#### Backend/data
Créer une migration pour `public.thread_messages` :
- ajouter `reply_to_id uuid references public.thread_messages(id) on delete set null`
- ajouter l’index correspondant

#### Types + hooks
Mettre à jour :
- `src/types/thread.ts`
- `src/hooks/useThreadMessages.ts`

pour :
- sélectionner `reply_to_id`
- résoudre `repliedMessage` comme c’est déjà fait pour `messages` et `dm_messages`
- gérer optimistic update avec snapshot de la cible
- gérer le fallback `deleted: true`

#### UI thread
Dans `ThreadView.tsx` :
- supprimer la logique `parseRepliedMessage(message.content)` pour les vrais replies
- rendre `RepliedLine` depuis `message.repliedMessage`
- envoyer `replyToId: replyingTo?.id ?? null` dans `useSendThreadMessage`
- garder `parseRepliedMessage` seulement en compat legacy pour anciens messages déjà stockés en blockquote

Résultat :
- desktop/tablette auront enfin de vraies réponses dans les threads
- pas seulement un affichage simulé

### 4. Étendre la parité tablette/desktop pour l’action “Répondre”
Aujourd’hui le swipe-to-reply est mobile-only dans :
- `ChatArea.tsx`
- `DMConversation.tsx`
- `ThreadView.tsx`

Il faut décider une vraie parité desktop/tablette :
- Tablette : activer la gestuelle tactile aussi sur `isTablet`
- Desktop souris : ne pas forcer le swipe, mais garantir que l’action “Répondre” hover/context menu marche partout
- ne plus présenter comme “intégré partout” tant que `enabled` reste mobile-only

Correction concrète :
- remplacer `enabled={isMobile}` par `enabled={isMobile || isTablet}` là où la surface est tactile
- conserver le bouton hover + menu contextuel sur desktop

### 5. Harmoniser `RepliedLine` sur toutes les surfaces desktop/tablette
Utiliser la même structure de rendu partout :
- `RepliedLine`
- bloc avatar + auteur + timestamp
- contenu message

Ajustements à unifier :
- `indent={56}` pour avatar 40px
- `indent={44}` pour avatar 32px
- `className="mb-1"` ou valeur unique décidée une fois pour toutes
- wrapper message avec `pt-2.5` quand reply visible
- même densité entre messages groupés et non groupés

Cibles :
- `ChatArea.tsx`
- `DMConversation.tsx`
- `AnnouncementChannel.tsx`
- `ThreadView.tsx`

### 6. Compatibilité ascendante
Ne pas casser les anciens messages déjà envoyés avec citation texte.

Règle :
- si `repliedMessage` existe -> rendu intégré prioritaire
- sinon, si ancien format blockquote détecté -> fallback lecture seule via `parseRepliedMessage`
- pour les nouvelles réponses, ne plus jamais sérialiser la citation dans `content`

### 7. Vérification fonctionnelle à faire après implémentation
Tester explicitement sur Desktop et Tablette :

#### Serveur classique
- répondre à un message
- voir `RepliedLine`
- cliquer pour jump
- message groupé / non groupé

#### DM
- reply depuis bouton hover
- affichage immédiat après envoi
- jump et fallback deleted

#### Annonces
- reply sur desktop
- plus aucun blockquote injecté dans le contenu
- `RepliedLine` visible dans la liste

#### Threads
- reply sur desktop/tablette
- persistance réelle en base
- anciens messages legacy encore lisibles

## Résultat attendu

Après correction, le système de réponses sera réellement intégré sur Desktop/Tablette au lieu d’être seulement partiellement présent :

- Serveur : vrai système
- DM : vrai système
- Annonces : vrai système
- Threads : vrai système
- Tablette : action reply disponible aussi
- Anciens messages legacy encore affichés sans casse

## Détails techniques

- `AnnouncementChannel.tsx` est actuellement encore en mode faux reply Markdown.
- `ThreadView.tsx` est actuellement encore en mode faux reply via `parseRepliedMessage`.
- `thread_messages` n’a pas encore `reply_to_id`, donc aucune vraie intégration thread n’est possible sans migration.
- `ChatArea.tsx` et `DMConversation.tsx` servent déjà de référence d’implémentation correcte.
- Aucun fichier auto-géré à modifier.
