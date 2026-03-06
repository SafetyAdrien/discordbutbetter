

# Corriger le spine des threads dans la liste des salons

## Problèmes identifiés

1. **Thread unique** : quand un seul thread est visible, la ligne verticale continue apparaît inutilement — seule la courbe en L suffit
2. **Threads multiples** : la ligne verticale doit être continue entre les threads, avec une branche horizontale au milieu de chaque thread
3. **Espacement** : l'écart entre le spine et le lien du thread est incorrect

## Correction — `src/components/layout/ChannelList.tsx` (lignes 593-604)

```tsx
// Avant
.map((thread, index, filteredArr) => {
  const isLast = index === filteredArr.length - 1;
  return <div key={thread.id} className="flex items-center w-full px-2">
    <div className="flex-shrink-0 w-8 relative mr-1.5 self-stretch">
      <div 
        className="absolute left-[6px] top-0 w-0.5 bg-muted-foreground/30"
        style={{ height: isLast ? '50%' : '100%' }}
      />
      <div className="absolute left-[6px] top-1/2 -translate-y-1/2 w-[20px] h-[12px] border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg" />
    </div>

// Après
.map((thread, index, filteredArr) => {
  const isLast = index === filteredArr.length - 1;
  const isSingle = filteredArr.length === 1;
  return <div key={thread.id} className="flex items-center w-full px-2">
    <div className="flex-shrink-0 w-6 relative self-stretch">
      {/* Ligne verticale : masquée si thread unique */}
      {!isSingle && (
        <div 
          className="absolute left-[6px] top-0 w-0.5 bg-muted-foreground/30"
          style={{ height: isLast ? '50%' : '100%' }}
        />
      )}
      {/* Courbe en L */}
      <div className="absolute left-[6px] top-1/2 -translate-y-1/2 w-[14px] h-[12px] border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg" />
    </div>
```

Changements :
- `isSingle` : si un seul thread visible, pas de ligne verticale — juste la courbe
- Conteneur : `w-8 mr-1.5` → `w-6` (réduit l'espacement excessif entre spine et lien)
- Courbe : `w-[20px]` → `w-[14px]` pour que la branche horizontale se termine juste avant le texte du thread

| Fichier | Modification |
|---|---|
| `src/components/layout/ChannelList.tsx` | Logique `isSingle`, suppression ligne verticale pour thread unique, ajustement largeurs |

