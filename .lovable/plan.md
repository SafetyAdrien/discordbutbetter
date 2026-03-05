

# Corrections demandées — 3 points

## 1. Police du titre "Bienvenue dans #salon"

**Problème** : Ligne 1025 de `ChatArea.tsx` utilise `font-display` qui résout vers `Orbitron` (tailwind.config.ts ligne 29).

**Correctif** : Remplacer `font-display` par `font-ginto` dans le `<h1>` de bienvenue.

- `src/components/chat/ChatArea.tsx` ligne 1025 : `font-display` → `font-ginto`

---

## 2. Flash du ChatInput au changement de salon

**Problème** : Quand on change de salon, `useMultipleChannelPermissions` reçoit un nouveau `channelId`. React Query considère les nouvelles queries comme "non-pending" brièvement avant de lancer le fetch, donc `permissionsLoading` passe à `false` un instant → l'input affiche l'état "autorisé" ou "refusé" incorrectement pendant une frame.

**Correctif** : Ajouter un `prevChannelIdRef` dans `ChatArea.tsx`. Quand `channel.id` change, forcer `permissionDeniedMessage = undefined` (état neutre/accessible) pendant la transition, jusqu'à ce que `permissionsLoading` se stabilise pour le nouveau channelId. Concrètement :

```tsx
const prevChannelIdRef = useRef(channel.id);
const isChannelTransitioning = prevChannelIdRef.current !== channel.id;

useEffect(() => {
  prevChannelIdRef.current = channel.id;
}, [channel.id]);

const permissionDeniedMessage = (isChannelTransitioning || permissionsLoading || isAdminOrOwner || canSendMessages)
  ? undefined
  : "Vous n'avez pas la permission d'envoyer des messages dans ce salon.";
```

- `src/components/chat/ChatArea.tsx` : ajouter ref + modifier le calcul de `permissionDeniedMessage`

---

## 3. Tooltip avec date complète au hover du timestamp

**Problème** : Les timestamps (lignes 1243 et 1356) sont de simples `<span>` sans tooltip.

**Correctif** : Envelopper chaque timestamp dans un `<Tooltip>` affichant la date complète.

Deux emplacements dans `ChatArea.tsx` :
- **Ligne 1243** : timestamp du premier message d'un groupe (à côté du pseudo)
- **Ligne 1356** : timestamp des messages suivants (hover à gauche)

Format : `toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })`

---

### Fichier unique modifié
- `src/components/chat/ChatArea.tsx` (3 corrections isolées, rien d'autre touché)

