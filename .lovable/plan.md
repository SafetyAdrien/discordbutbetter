

## Problème
La zone qui contient le `MessageInput` / `AnnouncementComposer` (le wrapper en `pb-4 pt-2`) est totalement transparente — les messages défilent dessous et peuvent rester visibles juste sous le conteneur de saisie (zone marquée en rouge sur la capture). L'utilisateur veut un léger voile sombre + flou pour que le texte derrière transparaisse subtilement, sans masque opaque.

## Solution
Ajouter sur le wrapper qui entoure `MessageInput` (texte) et `AnnouncementComposer` (annonce) :
- `bg-background/60` (voile sombre semi-transparent — la couleur exacte sera ajustée selon la palette pour rester subtile, ~50–65% d'opacité)
- `backdrop-blur-sm` (léger flou des messages qui passent dessous)

Le **conteneur de saisie lui-même** (carte arrondie du composer) reste inchangé — déjà `bg-input` opaque. Seule la bande autour (haut + bas + côtés du wrapper `px-4 pb-4 pt-2`) devient un léger overlay.

## Fichiers à modifier

### 1. `src/components/chat/ChatArea.tsx` (ligne 1895)
```tsx
// AVANT
<div className="flex-shrink-0 w-full px-4 pb-4 pt-2 md:px-4 md:pb-4 md:pt-2">

// APRÈS
<div className="flex-shrink-0 w-full px-4 pb-4 pt-2 md:px-4 md:pb-4 md:pt-2 bg-background/60 backdrop-blur-sm">
```

### 2. `src/components/channels/AnnouncementChannel.tsx` (ligne 1094)
```tsx
// AVANT
<div className="flex-shrink-0 w-full px-4 pb-4 pt-2">

// APRÈS
<div className="flex-shrink-0 w-full px-4 pb-4 pt-2 bg-background/60 backdrop-blur-sm">
```

## Garanties « ne casse rien »
- Aucun changement structurel : seules 2 classes Tailwind ajoutées sur 2 wrappers
- Le `MessageInput` / `AnnouncementComposer` à l'intérieur garde son fond `bg-input` opaque → la carte de saisie reste nette
- `flex-shrink-0` préservé → pas de déplacement de mise en page
- `TypingIndicator` et `ReplyReference` restent visibles, posés sur le voile
- Aucun impact sur DM, Threads, Voice (modifications limitées aux deux wrappers cités)

## Hors-scope (non modifié)
- `DMConversation.tsx`, `ThreadView.tsx`, `VoiceChannelChat.tsx` : la demande mentionne explicitement « Texte et Annonces » uniquement.
- Aucun changement de tokens CSS ni de Tailwind config.

