

# Aperçu des mentions dans le champ de saisie (InputMarkdownOverlay)

## Problème

Quand une mention est insérée dans l'input (`<@123456789012345678>`, `<@&ID>`, `<#ID>`), elle s'affiche en texte brut. L'overlay Markdown ne détecte pas ces patterns et ne les rend pas visuellement.

## Corrections

### 1. `src/components/chat/InputMarkdownOverlay.tsx`

- Ajouter une nouvelle fonction `renderMentionsInline` qui détecte les patterns de mention (`<@ID>`, `<@&ID>`, `<#ID>`, `@everyone`, `@here`) dans le texte
- Résoudre les Snowflake IDs via des maps de lookup (members, roles, channels) passées en props
- Rendre les mentions avec un style coloré inline (span avec background/couleur comme les composants `UserMention`, `RoleMention`, `ChannelMention`) — mais en version simplifiée (pas de tooltip, juste le visuel)
- Intégrer ce rendu dans `renderInlineMarkdown` existant, ou l'appliquer en pré-traitement avant le rendu markdown
- Ajouter `hasInlineMentions(content)` exporté, pour détecter la présence de mentions
- Nouvelles props : `members`, `roles`, `channels` (même types que `MentionAutocomplete`)

### 2. `src/components/chat/MessageInput.tsx`

- Modifier `hasMarkdown` pour inclure aussi `hasInlineMentions(value)` — l'overlay s'active dès qu'une mention est présente même sans markdown
- Passer `members`, `roles`, `channels` en props à `<InputMarkdownOverlay>`

### Style des mentions dans l'overlay

- **User** : `bg-primary/30 text-[#dee0fc]` avec `@pseudo`
- **Role** : background `rgba(couleur, 0.3)` + couleur du rôle avec `@nom`
- **Channel** : `bg-[rgba(79,84,92,0.48)] text-[#c4c9ce]` avec icône `#` + nom
- **@everyone/@here** : `bg-[rgba(250,166,26,0.3)] text-[#faa61a]`

Le texte brut de la mention (`<@123...>`) est masqué et remplacé par le badge coloré, mais la longueur visuelle peut différer du texte réel — ce qui est acceptable car le caret reste géré par le textarea sous-jacent (même principe que les blocs de code dans l'overlay actuel).

