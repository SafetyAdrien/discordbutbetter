

# Fenêtre rétractable en split-view (Thread panel)

## Contexte actuel
Le thread panel utilise `flex-[4]` / `flex-[6]` pour le split 40/60. Un séparateur visuel `w-px bg-border/30` existe entre les deux panneaux. Il n'y a pas de resize interactif.

## Approche
Utiliser `react-resizable-panels` (déjà installé) pour rendre le panneau thread redimensionnable par l'utilisateur, **sans** afficher la poignée visuelle (grip) du handle — juste une bordure invisible draggable.

## Changements — `src/pages/Index.tsx`

**Remplacer** le conteneur flex actuel (lignes 588-700) par un `ResizablePanelGroup` :

```tsx
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

// Ligne ~588 : wrapper du contenu principal
<div className="flex-1 flex min-w-0 w-full overflow-x-hidden">
  {activeThreadId && channelForChat?.type === 'text' ? (
    <ResizablePanelGroup direction="horizontal" className="flex-1">
      {!threadFullscreen && (
        <ResizablePanel defaultSize={60} minSize={30} maxSize={80}>
          <div className="flex flex-col h-full w-full overflow-hidden">
            {/* ChatArea existant */}
          </div>
        </ResizablePanel>
      )}
      {!threadFullscreen && (
        <ResizableHandle className="w-px bg-border/30 hover:bg-primary/30 transition-colors cursor-col-resize" />
      )}
      <ResizablePanel defaultSize={threadFullscreen ? 100 : 40} minSize={20} maxSize={70}>
        <ThreadView ... />
      </ResizablePanel>
    </ResizablePanelGroup>
  ) : (
    // Cas sans thread : layout existant inchangé
    channelForChat && <div className="flex-1 min-w-0 flex flex-col ...">...</div>
  )}
</div>
```

**Points clés :**
- `minSize={30}` / `maxSize={80}` sur le chat — empêche de trop réduire/agrandir
- `minSize={20}` / `maxSize={70}` sur le thread — limite aussi de son côté  
- Le handle est un simple trait de 1px (`w-px bg-border/30`) sans grip visuel — pas d'effet "splitter" visible, juste une bordure draggable
- `hover:bg-primary/30` pour un feedback subtil au survol
- En mode fullscreen le chat est masqué et le thread prend 100%

## Fichier modifié
1. **`src/pages/Index.tsx`** — Remplacement du flex split par `ResizablePanelGroup`

