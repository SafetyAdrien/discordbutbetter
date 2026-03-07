

# ChatInput universel — marges identiques partout

## Constat
Le ChatInput (wrapper autour de `MessageInput`) a des marges différentes selon le contexte :
- **ChatArea.tsx** (text) : `px-4 pb-4 pt-2` ✅ — c'est la référence
- **DMConversation.tsx** : `px-4 pb-4 pt-2` ✅
- **ThreadView.tsx** : `px-4 pb-4 pt-2` ✅
- **AnnouncementChannel.tsx** : `bg-background px-2 pb-[env(...)] sm:px-0 sm:pb-0` ❌ — pas de marge
- **VoiceChannelChat.tsx** : aucun wrapper, `MessageInput` directement posé ❌

## Changements

### 1. `src/components/channels/AnnouncementChannel.tsx` (l.1061)
Remplacer le wrapper :
```
bg-background w-full px-2 pb-[env(safe-area-inset-bottom,0px)] sm:px-0 sm:pb-0
```
Par le wrapper universel :
```
flex-shrink-0 w-full px-4 pb-4 pt-2
```

### 2. `src/components/channels/voice/VoiceChannelChat.tsx` (l.339)
Envelopper le `<MessageInput>` dans un div avec le même padding :
```tsx
<div className="px-4 pb-4 pt-2">
  <MessageInput ... />
</div>
```

Résultat : toutes les instances de `MessageInput` dans l'app partagent exactement le même espacement `px-4 pb-4 pt-2`.

