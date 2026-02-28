

# Liste des serveurs en colonne verticale gauche + salons

## Objectif

Remplacer l'onglet "Serveurs" actuel (grille 3 colonnes plein ecran) par un layout a deux panneaux cote a cote, similaire au desktop Discord mais adapte au mobile :

```text
+--------+-------------------+
| Serveurs|  Liste salons    |
| (icons) |  du serveur      |
| vertical|  selectionne     |
|  ~56px  |  flex-1          |
+--------+-------------------+
|  Home | Serveurs | Notif | Vous |
+-------------------------------+
```

## Changements

### 1. `src/components/mobile/MobileServersView.tsx` -- Refonte complete

Remplacer la grille 3 colonnes par un layout flex horizontal :

- **Colonne gauche (~56px)** : barre verticale scrollable avec les icones de serveurs (rondes, ~40px), un separateur, puis les boutons Decouvrir (+) et Creer (boussole) en bas. Fond `bg-sidebar` ou `bg-card/50` pour le differencier. Le serveur actif a un indicateur lateral (petite barre blanche a gauche, comme sur desktop).
- **Colonne droite (flex-1)** : affiche le `MobileChannelListView` du serveur selectionne. Si aucun serveur n'est selectionne, un etat vide invite a choisir un serveur.

Le composant gerera un `selectedServerId` local initialise avec `activeServerId`. Quand l'utilisateur tape un serveur, la liste des salons a droite se met a jour immediatement (sans animation de slide).

### 2. `src/components/mobile/MobileLayout.tsx` -- Adapter la navigation

- Quand l'onglet "servers" est actif et que `mobileView.type === 'tab'`, le `MobileServersView` affiche deja les salons a cote des serveurs.
- Quand l'utilisateur tape un salon, le comportement existant continue : `mobileView` passe en `channels -> chat` avec l'animation slide existante.
- Supprimer l'etape intermediaire `mobileView.type === 'channels'` quand on vient de l'onglet serveurs, car la liste des salons est deja visible. Le tap sur un salon passe directement en mode `chat`.

Le `MobileServersView` recevra un nouveau callback `onChannelSelect(channelId, channelType)` en plus de `onServerSelect`. Quand un salon est tape, on navigue directement au chat.

### 3. `src/components/mobile/MobileChannelListView.tsx` -- Mode embarque

Ajouter un prop optionnel `embedded?: boolean` qui, quand il est vrai :
- Masque le header avec le bouton retour (puisque le composant est inline, pas en overlay)
- Supprime le padding/margin superieur du header
- Affiche juste le nom du serveur et les salons directement

### 4. Adaptation pour petits ecrans

Sur les ecrans tres petits (< 375px via `isSmallMobile`) :
- La colonne serveurs passe a 48px au lieu de 56px
- Les icones serveurs font 36px au lieu de 40px
- Les noms de salons utilisent `text-xs` au lieu de `text-sm`

## Detail technique de la colonne serveurs

```tsx
// Structure simplifiee
<div className="flex h-full">
  {/* Barre serveurs */}
  <div className="w-14 bg-[hsl(var(--sidebar-background))] flex flex-col items-center py-2 gap-1.5 border-r border-border/50 overflow-y-auto">
    {servers.map(server => (
      <button key={server.id} onClick={() => setSelectedServer(server.id)}>
        <Avatar className="w-10 h-10 rounded-2xl">...</Avatar>
        {/* Indicateur actif */}
        {selectedServer === server.id && (
          <div className="absolute left-0 w-1 h-5 bg-foreground rounded-r-full" />
        )}
        {/* Badge mentions */}
      </button>
    ))}
    <Separator />
    <button onClick={onDiscoverClick}>...</button>
    <button onClick={onCreateClick}>...</button>
  </div>

  {/* Liste salons */}
  <div className="flex-1 overflow-hidden">
    {selectedServer ? (
      <MobileChannelListView
        embedded
        serverId={selectedServer}
        onChannelSelect={onChannelSelect}
        ...
      />
    ) : (
      <EmptyState />
    )}
  </div>
</div>
```

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/mobile/MobileServersView.tsx` | Refonte : layout 2 colonnes (serveurs + salons) |
| `src/components/mobile/MobileLayout.tsx` | Passer `onChannelSelect` a MobileServersView, gerer la navigation directe serveur->chat |
| `src/components/mobile/MobileChannelListView.tsx` | Ajouter prop `embedded` pour masquer le header |

