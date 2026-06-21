## Problème constaté

Le bloc « Connecté · Vocal » au-dessus du profil **ne s'affiche pas**. Le code dans `Index.tsx` est bien là (`{isConnected && voiceState.channelName && <VoiceControls .../>}`), mais le composant `VoiceControls` actuel duplique les boutons mic/casque/déconnexion qui sont déjà dans `UserProfileCard` — ce n'est pas ce que tu as demandé. Tu veux juste un **bloc de statut** indiquant le salon vocal, séparé légèrement de la carte profil.

Par ailleurs, à ce stade je n'ai pas la preuve que `isConnected && voiceState.channelName` se déclenchent correctement dans la branche de rendu fixe (z-40), donc il faut aussi vérifier le rendu effectif.

## Plan

### 1. Créer un nouveau composant `VoiceStatusBadge`
Fichier : `src/components/layout/VoiceStatusBadge.tsx`

Petit bloc compact (~52px de haut) avec :
- Pastille verte animée (`bg-[hsl(var(--online))]` + `animate-pulse`) + `VoiceConnectionIndicator` pour la qualité de connexion
- Ligne 1 : « **Vocal connecté** » en `text-xs font-semibold text-[hsl(var(--online))]`
- Ligne 2 : `channelName / serverName` en `text-xs text-muted-foreground truncate`
- Bouton `PhoneOff` rouge à droite (taille `w-7 h-7`, `rounded-full`, `bg-destructive/10`) pour quitter rapidement
- Style : `bg-[hsl(var(--surface-2))] rounded-2xl mx-2 px-3 py-2 border border-border/40`, `box-shadow: var(--shadow-elevation-2)`
- **Pas** de boutons mic/casque/PTT (déjà présents dans `UserProfileCard`)

### 2. Remplacer `VoiceControls` par `VoiceStatusBadge` dans `Index.tsx`
- Importer `VoiceStatusBadge` à la place de `VoiceControls`
- Ajouter un `mb-1.5` entre les deux blocs pour la « séparation légère » demandée
- Garder le wrapper `fixed bottom-0 left-0 z-40` avec `width: calc(80px + 2px + 240px)`
- Garder `flex flex-col gap-1.5`

### 3. Garder `VoiceControls.tsx` intact
Il est encore utilisé ailleurs (mobile / tablet / vues dédiées). On ne le supprime pas.

### 4. Vérifier les spacers
`ChannelList.tsx` et `DMPage.tsx` réservent actuellement `h-[220px]` quand `isConnected`. Comme le nouveau badge est plus petit (~52px), réduire à :
- `h-[130px]` quand connecté (52px badge + 6px gap + 68px profil + marges)
- `h-[68px]` sinon

### 5. Validation
- Screenshot du preview après modif pour confirmer que le bloc apparaît au-dessus du profil quand on rejoint un salon vocal
- Vérifier l'alignement et la séparation visuelle

## Fichiers touchés

- **Créé** : `src/components/layout/VoiceStatusBadge.tsx`
- **Modifié** : `src/pages/Index.tsx`, `src/components/layout/ChannelList.tsx`, `src/components/dm/DMPage.tsx`
- **Non touché** : `VoiceControls.tsx`, `UserProfileCard.tsx`, `VoiceContext.tsx`