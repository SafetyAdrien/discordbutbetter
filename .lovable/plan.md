

# Sondages Realtime + Timestamps visibles partout

## 1. Sondages en temps réel complet

### Problème actuel
- Seul `poll_votes` a un abonnement realtime, et il fait un `invalidateQueries` (re-fetch complet) au lieu d'une mise à jour ciblée
- Aucun abonnement sur `polls` (création, modification question, fin/expiration) ni `poll_options` (modification options)
- Les autres utilisateurs ne voient pas les nouveaux sondages, modifications ou fins en temps réel

### Plan

**Migration SQL** : Ajouter `poll_options` à la publication realtime
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;
```

**`src/hooks/usePolls.ts`** : Remplacer les abonnements actuels par 3 channels isolés (pattern existant du projet) dans `usePolls` et `useThreadPolls` :

1. **Channel `polls`** : écouter INSERT (nouveau sondage), UPDATE (modification question, `expires_at` pour fin), DELETE (suppression)
   - INSERT : fetcher le poll complet avec options/votes et l'ajouter au cache
   - UPDATE : mettre à jour `question`, `expires_at` dans le cache
   - DELETE : retirer du cache

2. **Channel `poll_options`** : écouter `*` → `invalidateQueries` (la structure des options a changé)

3. **Channel `poll_votes`** : écouter INSERT/DELETE avec mise à jour ciblée du cache (pas de re-fetch)
   - INSERT : ajouter le vote au poll correspondant (fetcher le profil votant)
   - DELETE : retirer le vote du cache

## 2. Timestamps visibles sur tous les messages

### Problème actuel
- Sur les messages groupés (même auteur, < 5 min), le timestamp n'apparaît qu'au hover (`opacity-0 group-hover:opacity-100`)
- Sur les sondages groupés, aucun timestamp n'est affiché

### Plan

**`src/components/chat/ChatArea.tsx`** :
- Messages groupés (ligne ~1400) : retirer `opacity-0 group-hover:opacity-100` du `<span>` du timestamp pour qu'il soit toujours visible
- Sondages groupés (lignes 1146-1151) : ajouter un timestamp visible dans la zone `w-10` à gauche, comme pour les messages groupés

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| Migration SQL | `poll_options` → realtime publication |
| `src/hooks/usePolls.ts` | 3 channels realtime isolés avec cache updates ciblés |
| `src/components/chat/ChatArea.tsx` | Timestamps toujours visibles + timestamp sur sondages groupés |

