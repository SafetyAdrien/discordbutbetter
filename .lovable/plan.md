

## Objectif
Remplacer le `Popover` (clic sur la chevron) par un `HoverCard` qui s'ouvre au survol du bouton "Envoyer", et simplifier le contenu (juste label + toggle à droite, sans description).

## Changements

### `src/components/channels/announcement/AnnouncementComposer.tsx`

**1. Imports**
- Retirer `Popover, PopoverContent, PopoverTrigger` et `ChevronDown` (du split button)
- Ajouter `HoverCard, HoverCardContent, HoverCardTrigger` depuis `@/components/ui/hover-card`
- Retirer l'état `optionsOpen` (plus nécessaire)

**2. Bouton Envoyer (footer ~lignes 365-400)**
Supprimer le split button (Send + Chevron) et le remplacer par un `HoverCard` qui enveloppe uniquement le bouton "Envoyer" :

```tsx
<HoverCard openDelay={150} closeDelay={150}>
  <HoverCardTrigger asChild>
    <Button onClick={handleSubmit} disabled={!canSubmit} className="h-8 px-4 gap-1.5">
      <Send className="w-3.5 h-3.5" />
      Envoyer
    </Button>
  </HoverCardTrigger>
  {(canCreateThreads || canPublish) && (
    <HoverCardContent align="end" side="top" className="w-56 p-2 bg-popover">
      {canCreateThreads && (
        <label className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer">
          <span className="text-sm text-foreground">Créer un fil</span>
          <Switch checked={createThreadEnabled} onCheckedChange={setCreateThreadEnabled} />
        </label>
      )}
      {canPublish && (
        <label className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer">
          <span className="text-sm text-foreground">Publier</span>
          <Switch checked={autoPublishEnabled} onCheckedChange={setAutoPublishEnabled} />
        </label>
      )}
    </HoverCardContent>
  )}
</HoverCard>
```

**3. Comportement préservé**
- Logique `handleSubmit`, `createThreadEnabled`, `autoPublishEnabled`, `threadName` input conditionnel : inchangés
- Si ni `canCreateThreads` ni `canPublish` : le HoverCard reste mais sans contenu déroulant (équivalent à un simple bouton)

## Résultat
- ✅ Plus de chevron ni de popover sur clic
- ✅ Survol du bouton "Envoyer" → mini-panneau au-dessus avec « Créer un fil » et « Publier » (label gauche + toggle droite)
- ✅ Plus de descriptions verbeuses ni de compteur de followers
- ✅ Aucun changement de logique d'envoi/publication

## Fichier modifié
- `src/components/channels/announcement/AnnouncementComposer.tsx`

