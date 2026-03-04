

# Plan de correction : Mentions de salons, backslash, multi-embeds

## Diagnostic des causes racines

### Bug 1 : Crash navigation mentions de salons
**Cause** : `onChannelNavigate` dans `ChatArea.tsx` (ligne 601-603) appelle `navigate('/channels/${serverId}/${channelId}')`. Or `App.tsx` n'a AUCUNE route `/channels/:serverId/:channelId` — seulement `/` et `*` (NotFound). Résultat : cliquer sur une mention `#salon` navigue vers une page 404.

**Correction** : Remplacer la navigation URL par une navigation interne via les setters d'état. Le `ChatArea` a besoin d'un callback `onChannelSelect` passé depuis `Index.tsx` qui appelle directement `setActiveServerId` + `setActiveChannelId`.

### Bug 2 : Backslash ne fonctionne pas
**Cause** : Dans `parseMarkdown` (ligne 756), le regex `hasBlockElements` ne détecte pas les lignes échappées (`\# texte`). Si le message ne contient que du texte avec `\#`, il passe par le chemin inline-only (ligne 758-766), qui ne passe jamais par `parseBlocks` — et donc le `\` n'est jamais retiré.

**Correction** : Ajouter la détection des lignes échappées dans le regex `hasBlockElements`, OU modifier le chemin inline-only pour aussi traiter les `\` en début de ligne.

### Bug 3 : Multi-embeds ne s'affichent pas
**Cause** : L'extraction d'URLs et le composant `LinkEmbeds` fonctionnent correctement en théorie. Le problème potentiel est que la réponse de l'edge function renvoie une erreur pour certaines URLs (404, timeout, pas de HTML) et le cache retient `null`, donc l'embed ne s'affiche jamais. Le composant `LinkEmbed` retourne `null` quand `!data` (ligne 31). Ajouter un fallback minimal quand les métadonnées sont absentes mais que l'URL est valide.

## Modifications fichier par fichier

### 1. `src/components/chat/ChatArea.tsx`
- Ajouter une prop `onChannelSelect?: (channelId: string) => void` au `ChatAreaProps`
- Modifier `onChannelNavigate` (ligne 601-603) pour utiliser `onChannelSelect` au lieu de `navigate()`
- Si le `serverId` cible est le même serveur actuel, appeler `onChannelSelect(channelId)`
- Si c'est un autre serveur, garder le comportement actuel (pas de navigation cross-server sans props)

### 2. `src/pages/Index.tsx`
- Passer `onChannelSelect={(channelId) => { setActiveChannelId(channelId); if (activeServerId) setChannelForServer(activeServerId, channelId); }}` au composant `ChatArea`

### 3. `src/lib/markdown.tsx`
- Ligne 756 : Modifier le regex `hasBlockElements` pour inclure `\\[#>*_\-]` comme pattern détectable :
  ```
  const hasBlockElements = /^(\\[#>\-*_]|#{1,3} |-# |> |>>> |\d+\. |[-*] |-{3,}|\*{3,}|_{3,})/m.test(content) || content.includes('```');
  ```

### 4. `src/components/chat/LinkEmbed.tsx`
- Quand `!data` (pas de métadonnées), afficher un embed minimal avec le hostname et l'URL au lieu de retourner `null`
- Appliquer uniquement pour les URLs valides (pas les erreurs réseau)
- Modifier le cache dans `useUrlMetadata.ts` pour distinguer "pas de données" de "erreur réseau" en stockant un objet spécial pour les URLs accessibles sans OG tags

### 5. `src/hooks/useUrlMetadata.ts`
- Quand le fetch retourne une erreur 404 ou "Not an HTML page", stocker un objet metadata minimal `{ title: hostname, siteName: hostname, ... }` au lieu de `null`
- Quand le fetch échoue (réseau), garder `null`

## Résumé des changements

| Fichier | Action |
|---|---|
| `ChatArea.tsx` | Navigation interne via callback au lieu d'URL |
| `Index.tsx` | Passer `onChannelSelect` à ChatArea |
| `markdown.tsx` | Détecter `\` dans `hasBlockElements` |
| `LinkEmbed.tsx` | Embed fallback pour URLs sans métadonnées |
| `useUrlMetadata.ts` | Distinguer erreur réseau vs absence de données OG |

