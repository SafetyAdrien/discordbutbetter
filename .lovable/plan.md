

# Split-view rétractable pour la liste des salons

## Changement — `src/pages/Index.tsx`

Envelopper le `<ChannelList>` et le contenu principal (lignes 551-700+) dans un `ResizablePanelGroup` avec un handle **entièrement transparent** (pas de bordure, pas de fond).

```tsx
// Remplacer le fragment <> contenant ChannelList + Main Content
<ResizablePanelGroup direction="horizontal" className="flex-1">
  <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
    <ChannelList ... />
  </ResizablePanel>
  <ResizableHandle className="w-0 border-0 bg-transparent cursor-col-resize opacity-0 hover:opacity-100 hover:w-px hover:bg-border/20 transition-all" />
  <ResizablePanel defaultSize={80} minSize={50}>
    <div className="flex-1 flex min-w-0 w-full overflow-x-hidden">
      {/* contenu existant inchangé */}
    </div>
  </ResizablePanel>
</ResizablePanelGroup>
```

**Points clés :**
- Handle totalement invisible (`w-0 opacity-0 bg-transparent`), léger feedback au hover uniquement
- `minSize={15}` empêche de réduire la channel list trop petit
- `maxSize={35}` empêche de l'agrandir excessivement
- 1 fichier modifié : `src/pages/Index.tsx`

