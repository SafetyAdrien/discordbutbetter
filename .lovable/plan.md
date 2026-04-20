

## Objectif

Compléter le système `@everyone` / `@here` avec :
1. Ciblage par statut différencié
2. Respect strict de la permission serveur `mention_everyone`
3. **Popup d'avertissement obligatoire** avant l'envoi de tout message contenant `@everyone` ou `@here`

## Comportement final

### Mentions et ciblage

| Mention | Notifie qui |
|---|---|
| `@everyone` | Tous les membres du serveur (`online`, `idle`, `dnd`, `offline`) — sauf l'auteur |
| `@here` | Uniquement les membres `online`, `idle`, `dnd` (exclut `offline`) — sauf l'auteur |

### Permission `mention_everyone`

- **Désactivée** → `@everyone` et `@here` masqués dans l'autocomplétion **et** ignorés côté trigger SQL (le message s'envoie, mais aucune entrée dans `channel_mentions`).
- **Activée** ou utilisateur owner/admin → mentions actives + popup d'avertissement déclenchée.

### Popup d'avertissement (nouveau)

Avant chaque envoi d'un message contenant `@everyone` ou `@here` (avec permission valide) :

**Titre** : "Mentionner tout le monde ?"

**Corps** : "Tu es sur le point de mentionner tout un groupe de personnes, souhaites-tu vraiment envoyer ou modifier ton message ?"

**Boutons** :
- **Publier** → envoie le message tel quel, déclenche les notifications
- **Modifier le message** → annule l'envoi, le contenu reste dans le textarea, focus rendu pour édition

**Conditions de déclenchement** :
- Détection regex `\B@(everyone|here)\b` dans le contenu
- Uniquement si l'utilisateur a la permission `mention_everyone` (sinon les mentions sont silencieusement ignorées sans popup, comme du texte normal)
- S'applique aux messages texte, threads, annonces — pas aux DMs (pas de `@everyone` en DM)

## Modifications

### 1. Migration SQL

**Nouvelle fonction** `can_mention_everyone(_user_id uuid, _server_id uuid)` SECURITY DEFINER :
- Owner principal/secondaire → `true`
- Rôle avec `administrator` → `true`
- Rôle avec `mention_everyone` → `true`
- Sinon → `false`

**Refonte** `detect_and_insert_mentions()` :
- Vérifier la permission via `can_mention_everyone` avant d'insérer pour `@everyone` ou `@here`
- `@everyone` → tous les membres du serveur (sauf auteur)
- `@here` → membres avec `profiles.status IN ('online','idle','dnd')` (sauf auteur)
- Le reste du trigger (mentions utilisateur, rôles) inchangé

### 2. Nouveau composant `MentionEveryoneWarningModal.tsx`

Modal léger basé sur `AlertDialog` shadcn :
- Props : `open`, `mentionType: 'everyone' | 'here' | 'both'`, `onConfirm`, `onEdit`
- Titre dynamique selon `mentionType`
- 2 boutons : **Publier** (variant primary) et **Modifier le message** (variant secondary)
- Pas de dismiss par clic extérieur (force le choix explicite)

### 3. Intégration dans `MessageInput.tsx`

- Détection regex au moment du `handleSubmit`
- Si match + permission → ouvrir le modal au lieu d'envoyer
- Stocker temporairement le payload (content + attachments) dans un état local
- **Publier** → exécute l'envoi original + ferme le modal
- **Modifier** → ferme le modal, restitue le focus au textarea, contenu préservé
- Préférence utilisateur ignorée (pas de "Ne plus afficher" pour le moment, comme demandé)

### 4. Intégration dans `ThreadView.tsx`

Même logique que `MessageInput` pour les messages envoyés dans les threads (réutilise le même modal).

### 5. Intégration dans `AnnouncementComposer.tsx`

Même logique pour les annonces (réutilise le même modal).

### 6. Permission resolution côté client

Réutiliser `usePermissions` pour exposer `canMentionEveryone` au composer. Si déjà disponible via `MentionAutocomplete`, le hook est partagé. Sinon, ajout d'un sélecteur léger dans le composer parent.

### 7. Mise à jour `src/constants/permissions.ts`

Description de `mention_everyone` mise à jour :
> "Permet de notifier tous les membres (`@everyone`) ou uniquement les membres en ligne (`@here`)"

## Détails techniques

- **Détection** : `/\B@(everyone|here)\b/` exécutée juste avant l'envoi (pas pendant la frappe pour éviter les déclenchements parasites)
- **Permission checking côté client** : optimiste — on affiche le popup même si le client pense avoir la permission. Le trigger SQL reste la source de vérité.
- **Pas de popup en DM** : les DMs n'ont pas de notion de `@everyone`
- **Pas de popup pour l'édition de message** : seulement à l'envoi initial (cohérent avec Discord)
- **Réutilisation** : un seul composant `MentionEveryoneWarningModal` partagé entre les 3 composers
- **i18n** : strings en français (cohérent avec le reste de l'UI)

## Fichiers modifiés / créés

- `supabase/migrations/<nouveau>.sql` — fonction `can_mention_everyone` + refonte `detect_and_insert_mentions`
- `src/constants/permissions.ts` — description mise à jour
- `src/components/chat/MentionEveryoneWarningModal.tsx` — **nouveau composant**
- `src/components/chat/MessageInput.tsx` — détection + intégration modal
- `src/components/threads/ThreadView.tsx` — intégration modal
- `src/components/channels/announcement/AnnouncementComposer.tsx` — intégration modal

## Garantie de non-régression

- Aucune modification du moteur Markdown (`src/lib/markdown.tsx`)
- Aucune modification du système de mentions utilisateur/rôle/salon
- Aucun changement sur le rendu visuel des mentions `@everyone` / `@here` (style jaune/orange déjà en place)
- Notifications/badges fonctionnent automatiquement via la table `channel_mentions` existante
- Pas d'impact sur les DMs ni le système de présence

