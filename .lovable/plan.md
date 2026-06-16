## Objectif

Supprimer l'écart entre le badge de mention et le curseur (ou texte suivant) en cessant de stocker le token long `<@SNOWFLAKE>` dans le textarea. Le textarea contiendra désormais la forme courte affichable (`@displayName`, `#channelName`, `@roleName`) ; la conversion vers le format protocole `<@SNOWFLAKE>` / `<#SNOWFLAKE>` / `<@&SNOWFLAKE>` se fera juste avant l'envoi.

## Changements

### 1. `src/components/chat/MentionAutocomplete.tsx`
- `onSelect` reçoit désormais le **token court à stocker dans l'input** (et pas `<@SNOWFLAKE>`).
- User : `onSelect(\`@${member.displayName}\`, ...)` 
- Role : `onSelect(\`@${role.name}\`, ...)`
- Channel : `onSelect(\`#${channel.name}\`, ...)`
- `@everyone` / `@here` restent inchangés (déjà courts).

### 2. `src/components/chat/MessageInput.tsx`
- **Nouveau ref** `pendingMentionsRef = useRef<Array<{ display: string; token: string }>>([])` qui accumule les associations `@displayName → <@SNOWFLAKE>` insérées par l'autocomplete.
- `handleMentionSelect(insertText, displayText)` : insère `insertText` (la forme courte) dans `value`, et ajoute au ref `{ display: insertText, token: '<@SNOWFLAKE>' }` calculé depuis la sélection (user/role/channel id → snowflake).
  - Pour cela, `onSelect` reçoit un 3e argument `token: string` contenant la forme `<@…>` correspondante. Mise à jour de l'interface `MentionAutocompleteProps.onSelect = (insertText, displayText, token) => void`.
- **Avant envoi** (dans `performSend` / `handleSendMessage`) : construire `serializedValue` à partir de `value` en remplaçant chaque `pendingMentionsRef.current[i].display` par son `token`, en respectant l'ordre d'apparition et en ne remplaçant que la première occurrence non encore consommée à chaque itération. Passer `serializedValue` à `onSend` (via un override interne) à la place de `value`.
- Au reset post-envoi : vider `pendingMentionsRef.current`.
- Si l'utilisateur supprime manuellement une mention (le texte `@displayName` n'est plus présent dans `value`), purger l'entrée correspondante du ref via un `useEffect([value])` qui filtre les entrées dont `display` n'apparaît plus dans `value`.

### 3. `src/components/chat/InputMarkdownOverlay.tsx`
- `renderMentionsInline` doit aussi reconnaître les formes courtes pour appliquer le style « pill » dans l'overlay :
  - Regex étendue : `(<@&\d{18}>|<@\d{18}>|<#\d{18}>|@everyone|@here)` + nouveau passage qui détecte les segments `@displayName` / `#channelName` / `@roleName` à partir de la liste `mentionData.members/roles/channels`.
- Implémentation : après le passage actuel, repasser sur les fragments texte restants et y remplacer les correspondances exactes de `@${member.displayName}`, `#${channel.name}`, `@${role.name}` par des badges (mêmes styles que les badges actuels — violet `bg-primary/30 text-[#dee0fc]` pour user/role/channel, couleur du rôle pour les rôles).
- Détection par ordre : longueur descendante des noms pour éviter qu'un `@Adrien` matche dans `@Adrien Moulin`.

### 4. Vérifications
- Détection trigger (`detectMentionTrigger`) reste basée sur `@` / `#` + query — inchangée.
- Le format envoyé en base reste `<@SNOWFLAKE>` (compatibilité messages existants, parsing côté affichage, notifications de mention via `detect_and_insert_mentions` trigger DB).
- L'édition d'un message existant (qui contient déjà `<@SNOWFLAKE>`) doit pré-convertir vers la forme courte à l'ouverture : ajouter une étape dans le composant d'édition (`MessageEditForm` / équivalent) qui parse le contenu chargé et remplit `pendingMentionsRef` + remplace les tokens longs par leurs formes courtes avant d'hydrater le `value`. *(Si l'édition n'utilise pas `MessageInput`, à confirmer lors de l'exploration build.)*

## Hors périmètre

- Pas de changement du format en base ni du rendu des messages envoyés.
- Pas de modification du système de détection de mentions côté serveur.
- Style visuel du badge (violet) inchangé — déjà aligné dans la tâche précédente.
