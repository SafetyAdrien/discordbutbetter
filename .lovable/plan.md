

# Permettre aux auteurs de mettre fin à leurs sondages

## Approche

L'auteur d'un sondage peut le terminer à tout moment en mettant `expires_at` à `now()`. Deux points d'accès :
1. **Bouton dans PollDisplay** : visible uniquement pour l'auteur, à l'opposé du temps restant (dans le footer du sondage)
2. **Menu clic-droit et hover** : option "Terminer le sondage" dans les menus contextuels et dropdown des sondages (ChatArea + ThreadView)

## Migration SQL

Ajouter une policy UPDATE sur la table `polls` pour que les auteurs puissent mettre à jour `expires_at` :

```sql
CREATE POLICY "Authors can update their polls"
ON public.polls FOR UPDATE
USING (auth.uid() = author_id);
```

## Changements dans `usePolls.ts`

Ajouter un hook `useEndPoll` :
- Mutation : `supabase.from('polls').update({ expires_at: new Date().toISOString() }).eq('id', pollId)`
- Optimistic update : mettre `expires_at` dans le passé immédiatement dans le cache

## Changements dans `PollDisplay.tsx`

- Ajouter un bouton "Terminer" dans la zone footer, à droite, visible uniquement si `poll.author_id === user.id` et que le sondage n'est pas expiré
- Utiliser le hook `useEndPoll`

## Changements dans `ChatArea.tsx`

- Dans `PollActions` (hover toolbar) : ajouter un prop `onEndPoll` et l'afficher dans le dropdown quand `isOwnPoll && !isExpired`
- Dans le context menu du sondage : ajouter "Terminer le sondage" avec icône `StopCircle`, avant "Modifier"
- Passer `onEndPoll` depuis le rendu des sondages

## Changements dans `ThreadView.tsx`

- Même ajout dans le hover toolbar et le context menu des sondages

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| Migration SQL | Policy UPDATE pour auteurs |
| `src/hooks/usePolls.ts` | Nouveau hook `useEndPoll` |
| `src/components/chat/PollDisplay.tsx` | Bouton "Terminer" dans le footer |
| `src/components/chat/ChatArea.tsx` | Option dans hover + context menu |
| `src/components/threads/ThreadView.tsx` | Option dans hover + context menu |

