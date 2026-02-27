
# Supprimer completement le systeme de toast shadcn (popup)

## Objectif
Retirer entierement le systeme de notification shadcn (`Toaster` / `use-toast`) et migrer tous les appels vers **Sonner** (deja utilise dans 51 fichiers du projet).

## Fichiers a migrer (remplacer `toast({title, description, variant})` par `toast.success/error()` de sonner)

### 1. `src/hooks/useStageChannel.ts`
- Changer l'import de `'@/hooks/use-toast'` vers `'sonner'`
- Convertir ~6 appels `toast({...})` :
  - `toast({ title: 'Erreur', variant: 'destructive' })` -> `toast.error('Erreur : ...')`
  - `toast({ title: 'Session creee' })` -> `toast.success('Session creee')`
  - etc.

### 2. `src/components/dm/DMList.tsx`
- Changer l'import vers sonner
- Convertir 3 appels (appels vocaux, conversation fermee, supprimee)

### 3. `src/components/layout/ServerList.tsx`
- Changer l'import vers sonner
- Convertir 2 appels (marque comme lu, erreur proprietaire)

### 4. `src/components/layout/ChannelList.tsx`
- Changer l'import vers sonner
- Convertir 3 appels (salon supprime, erreur suppression, marque comme lu)

### 5. `src/hooks/useServerOrder.ts`
- Changer l'import vers sonner
- Convertir 1 appel erreur

### 6. `src/lib/clipboard.ts`
- Changer l'import vers sonner
- Convertir 2 appels (succes copie, erreur copie)

## Fichiers a supprimer / nettoyer

### 7. `src/App.tsx`
- Retirer l'import et le composant `<Toaster />` (garder `<Sonner />`)

### 8. Fichiers devenus inutiles (a supprimer)
- `src/hooks/use-toast.ts` -- le hook shadcn complet
- `src/components/ui/toaster.tsx` -- le composant Toaster
- `src/components/ui/toast.tsx` -- les primitives Toast
- `src/components/ui/use-toast.ts` -- le re-export

## Convention de migration

| Avant (shadcn) | Apres (sonner) |
|---|---|
| `toast({ title: 'X' })` | `toast.success('X')` |
| `toast({ title: 'X', description: 'Y' })` | `toast.success('X', { description: 'Y' })` |
| `toast({ title: 'X', variant: 'destructive' })` | `toast.error('X')` |
| `toast({ title: 'X', description: 'Y', variant: 'destructive' })` | `toast.error('X', { description: 'Y' })` |
