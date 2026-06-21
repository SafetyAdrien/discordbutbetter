## Problème

Sur mobile, le contenu des messages dans `ChatArea.tsx` utilise plusieurs overrides `max-sm:` qui réduisent les espacements (gap avatar/contenu, padding vertical, marges entre éléments). Résultat : la zone du message est plus compacte/serrée qu'en desktop (visible dans la capture mobile vs desktop).

## Changements (un seul fichier : `src/components/chat/ChatArea.tsx`)

Supprimer les overrides mobiles d'espacement sur les blocs de message pour que mobile = desktop :

| Ligne | Avant | Après |
|---|---|---|
| 1303 | `px-4 py-4 max-sm:py-2 max-sm:px-3` | `px-4 py-4` |
| 1329 | `gap-4 my-3 max-sm:my-2` | `gap-4 my-3` |
| 1611 | `px-8 max-sm:px-4 ... pt-[5px] pb-[2px] max-sm:pt-[2px] max-sm:pb-[1px]` | `px-8 ... pt-[5px] pb-[2px]` |
| 1665 | `mb-1 max-sm:mb-0.5` | `mb-1` |
| 1668 | `flex gap-3 max-sm:gap-2 items-start` | `flex gap-3 items-start` |
| 1780 | `mt-0.5 max-sm:mt-0` | `mt-0.5` |
| 1786 | `mt-1 max-sm:mt-0.5` | `mt-1` |
| 1804 | `pt-1.5 pl-[50px] max-sm:pt-1` | `pt-1.5 pl-[50px]` |
| 1816 | `flex gap-3 max-sm:gap-2 items-start` | `flex gap-3 items-start` |
| 1900 | `mt-0.5 max-sm:mt-0` | `mt-0.5` |
| 1906 | `mt-1 max-sm:mt-0.5` | `mt-1` |
| 1924 | `pt-1.5 pl-[50px] max-sm:pt-1` | `pt-1.5 pl-[50px]` |

## Hors scope

Aucun changement de logique, ni des bulles DM mobile (`MobileMessageBubble`), ni des composants de mentions/MentionBadge. Uniquement l'espacement visuel des messages dans `ChatArea`.
