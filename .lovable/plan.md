

## Objectif

Lever la limite de 5 sujets dans la génération des résumés IA pour que tous les sujets distincts détectés dans la fenêtre de 100 messages soient retournés.

## Changements

### `supabase/functions/summarize-channel/index.ts`

**Prompt** :
- Retirer la phrase « Maximum 5 sujets »
- La remplacer par : « Identifie TOUS les sujets distincts présents dans la conversation, sans limite de nombre. Ne fusionne pas des sujets différents. Si la conversation contient 10 sujets distincts, retourne 10 sujets. »
- Garder la règle « Si rien de notable, retourne `{ "topics": [] }` »

Aucun autre changement nécessaire — la boucle d'insertion en base traite déjà N sujets, et le frontend (`useSummaries.ts` + `SummariesDropdown.tsx`) affiche déjà toute la liste sans cap.

## Fichier modifié

- `supabase/functions/summarize-channel/index.ts`

