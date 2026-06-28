## Cause confirmée
Le halo `isSpeakingSelf` n'est jamais visible sur l'avatar de la bannière du bas parce que Tailwind `ring-2` rend un `box-shadow` outset (dessiné hors de la box), et le wrapper racine de `UserAvatarImage` porte en dur `overflow-hidden rounded-full` (`src/components/ui/user-avatar-image.tsx` l.62-66). Le shadow est immédiatement clippé. `VoiceVideoTile` fonctionne parce qu'il utilise `border-2` (bordure interne, non clippée).

## Correctif — Fix O
Remplacer la technique `ring-*` par une vraie **bordure** sur le wrapper de l'avatar dans `UserProfileCard.tsx`, sans toucher à `UserAvatarImage` (composant partagé).

### Modification ciblée — `src/components/profile/UserProfileCard.tsx`
Dans le JSX de l'avatar de la bannière du bas (autour des lignes 163-172), remplacer :

```tsx
<UserAvatarImage
  ...
  className={cn(
    "w-8 h-8 ring-2 transition-colors",
    isSpeakingSelf ? "ring-[hsl(var(--online))]" : "ring-primary/30",
  )}
  ...
/>
```

par un wrapper qui porte la bordure (et conserve le rond), pendant que `UserAvatarImage` reste à la taille intérieure correspondante :

```tsx
<div
  className={cn(
    "rounded-full border-2 transition-colors",
    isSpeakingSelf ? "border-[hsl(var(--online))]" : "border-primary/30",
  )}
>
  <UserAvatarImage
    src={profile?.avatar_url}
    alt={profile?.display_name}
    className="w-8 h-8"
    fallbackClassName="bg-primary/20 text-primary text-sm"
    fallback={profile?.display_name?.charAt(0).toUpperCase() || '?'}
  />
</div>
```

La bordure est interne au wrapper externe (pas affectée par le `overflow-hidden` interne du composant `UserAvatarImage`), et le passage à `hsl(var(--online))` quand `isSpeakingSelf` est true sera réellement visible.

### Nettoyage diagnostic
Une fois le halo confirmé visible :
- Retirer le bloc `[DIAG UserProfileCard render]` (l.139-151 environ).
- Retirer `data-component="UserProfileCard-DIAG"`.
- Retirer les logs throttlés ajoutés dans `MediaManager.ts`, `useWebRTC.ts`, `VoiceContext.tsx`.

### Hors-scope
Pas de modification de `UserAvatarImage`, `VoiceVideoTile`, `VoiceContext`, VAD, `MediaManager` ni `AudioProcessor`. La logique VAD (Fix N) reste intacte — seule l'expression CSS du halo change.
