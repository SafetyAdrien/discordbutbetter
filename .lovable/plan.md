

# Ajustement des marges du layout desktop des paramètres serveur

## Changement

Modifier le layout desktop dans `ServerSettingsModal.tsx` (lignes 221-246) :

1. **Sidebar (liste des paramètres)** : Ajouter du padding vertical et une légère marge à gauche pour décoller du bord gauche de l'écran
2. **Zone de contenu** : Retirer le `max-w-2xl` pour que le contenu occupe toute la largeur disponible, avec un padding raisonnable. Ajouter une marge à droite pour respirer du bord droit

### `src/components/server-settings/ServerSettingsModal.tsx`

Remplacer le bloc desktop (lignes 221-246) :

```tsx
// Desktop: full-page sidebar + content
return (
  <div className="fixed inset-0 z-50 flex bg-background">
    {/* Sidebar avec marge gauche */}
    <div className="w-56 bg-card flex flex-col border-r border-border ml-4 my-4 rounded-lg">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold truncate">{serverName}</h2>
        <p className="text-xs text-muted-foreground">Paramètres du serveur</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {renderNavList((tab) => setActiveTab(tab))}
      </div>
    </div>
    {/* Contenu principal — occupe le reste avec marges */}
    <div className="flex-1 flex flex-col overflow-hidden my-4 mr-4">
      <div className="h-14 px-6 flex items-center justify-between border-b border-border flex-shrink-0">
        <h1 className={cn("text-lg font-semibold", activeTab === 'delete' && "text-destructive")}>
          {getCurrentTabLabel()}
        </h1>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {renderContent()}
      </div>
    </div>
  </div>
);
```

### Fichier modifié
- `src/components/server-settings/ServerSettingsModal.tsx`

