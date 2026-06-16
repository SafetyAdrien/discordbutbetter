## Objectif

Aligner le rendu des mentions de salons (`<#…>`) sur celui des mentions utilisateurs (`<@…>`), à la fois dans le conteneur de rédaction (overlay du textarea) et dans les messages envoyés. Les mentions de rôles utilisent déjà le même style ; aucune autre logique métier n'est modifiée.

## Changements

### 1. `src/components/chat/mentions/MentionComponents.tsx` — `ChannelMention`
Remplacer le style gris actuel (`bg-[rgba(79,84,92,0.48)] text-[#c4c9ce]`) par le style identique aux mentions utilisateurs :
- Fond : `bg-primary/30`
- Texte : `text-[#dee0fc]`
- Hover : `hover:bg-primary hover:text-white`
- Conservation de l'icône `Hash` (taille `w-3.5 h-3.5`) pour distinguer visuellement qu'il s'agit d'un salon, mais palette unifiée.

### 2. `src/components/chat/InputMarkdownOverlay.tsx` — `renderMentionsInline`
Dans la branche `match[4]` (mention de salon), remplacer :
```tsx
style={{ backgroundColor: 'rgba(79,84,92,0.48)', color: '#c4c9ce' }}
```
par les classes :
```tsx
className="rounded-[3px] px-[2px] bg-primary/30 text-[#dee0fc]"
```
pour que l'overlay de l'input affiche les mentions de salons exactement comme les mentions utilisateurs (badge violet clair). Le `#` reste devant le nom du salon (pas d'icône SVG dans l'overlay car celui-ci doit conserver les métriques de glyphes du textarea).

### 3. Vérification
- `MessageInput.tsx` passe déjà `mentionData={{ members, roles, channels }}` à `InputMarkdownOverlay` (ligne 640) — aucune modification nécessaire ici.
- Les mentions `@everyone` / `@here` (orange) et les rôles (couleur du rôle) restent inchangées.

## Hors périmètre

- Aucun changement de logique d'envoi, d'autocomplete, ou de parsing.
- Aucun changement de tokens design globaux.
