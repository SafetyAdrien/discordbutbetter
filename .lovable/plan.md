

# Plan : Corrections et implémentations chat

## 1. Chargement instantané des images et liens

**Problème** : Les images affichent un skeleton/flash avant de charger, et les embeds de liens causent un décalage de layout pendant le fetch des métadonnées.

**Solution** :
- **Images** : Pré-charger les URLs d'images via `new Image()` dès que les messages arrivent, pour que le navigateur les ait en cache avant le rendu.
- **Link Embeds** : Pré-fetcher les métadonnées de tous les liens dès réception des messages (pas seulement au rendu du composant). Ajouter un `useEffect` dans `ChatArea` qui extrait les URLs de tous les messages et lance `fetchMetadata` en avance.

**Fichiers** : `src/components/chat/ChatArea.tsx`, `src/hooks/useUrlMetadata.ts`

## 2. Mentions de salons → navigation

**Problème** : Le clic sur une mention `#salon` doit naviguer vers le salon correspondant.

**État actuel** : Déjà implémenté via `onChannelNavigate` dans le `markdownContext`. Le callback navigue vers `/channels/${server_id}/${channelId}`. Si un bug existe, il est probablement lié au contexte DM ou au fait que le `ChannelMention` component n'a pas le bon `serverId`. À vérifier et corriger si nécessaire.

**Fichiers** : `src/components/chat/mentions/MentionComponents.tsx`, `src/lib/markdown.tsx`

## 3. Embeds multiples pour plusieurs liens

**État actuel** : `LinkEmbeds` extrait déjà jusqu'à 5 URLs et rend un `LinkEmbed` par URL. Cela fonctionne déjà. Si ce n'est pas visible, c'est probablement dû au fait que le fetch échoue ou que les URLs sont filtrées par `extractUrls`. Je vérifierai que les URLs sont correctement extraites et que chaque embed se rend bien en cascade.

**Fichiers** : `src/hooks/useUrlMetadata.ts`, `src/components/chat/LinkEmbed.tsx`

## 4. Backslash `\` pour annuler le formatage

**Problème** : Le `\` fonctionne déjà pour les caractères inline (`\*`, `\~`, etc.) mais PAS pour les blocs (`\# titre`, `\> citation`, `\- liste`). La fonction `parseBlocks` ne vérifie pas les échappements.

**Solution** : Dans `parseBlocks`, avant de détecter les headers, blockquotes, listes, vérifier si la ligne commence par `\` suivi du caractère de bloc. Si oui, traiter comme un paragraphe normal en retirant le `\`.

**Fichier** : `src/lib/markdown.tsx` (fonction `parseBlocks`, lignes ~388-433)

---

## Résumé des modifications

| Fichier | Modification |
|---|---|
| `src/components/chat/ChatArea.tsx` | Pré-fetch images + métadonnées liens au chargement des messages |
| `src/hooks/useUrlMetadata.ts` | Exporter `fetchMetadata` pour usage externe de pré-chargement |
| `src/lib/markdown.tsx` | Gérer `\` devant les blocs (headers, quotes, listes) dans `parseBlocks` |
| `src/components/chat/LinkEmbed.tsx` | Aucune modification nécessaire (multi-embeds déjà fonctionnel) |

