## Problème identifié

La vidéo d'écran montre que le bouton « play » YouTube apparaît mais le thumbnail est noir, et après clic l'iframe reste totalement noir. Cause confirmée dans `index.html` ligne 6 : la CSP actuelle a `default-src 'self'` sans `frame-src` ni domaines tiers en `img-src`, donc :

- `img-src` n'autorise pas `i.ytimg.com` → thumbnails YouTube bloqués (noir).
- Pas de directive `frame-src` → l'iframe `youtube-nocookie.com` (et `player.twitch.tv`) tombe sur `default-src 'self'` et est bloquée → iframe noire.
- Pas de `img-src` pour `jtvnw.net` → previews et avatars Twitch bloqués aussi.

Les retries 429 et le cache serveur sont des demandes indépendantes pour fiabiliser `fetch-url-metadata`.

---

## 1. Correctif lecture (CSP)

**Fichier : `index.html`**

Étendre la balise `<meta http-equiv="Content-Security-Policy">` :

- Ajouter `frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://player.twitch.tv https://clips.twitch.tv;`
- Étendre `img-src` avec `https://i.ytimg.com https://*.ytimg.com https://*.jtvnw.net` (thumbnails YouTube + CDN Twitch).
- Étendre `media-src` avec `https://*.ttvnw.net` au cas où les chunks HLS de Twitch fuiteraient hors du player.

Aucune autre directive existante n'est touchée.

**Vérification après déploiement** : ouvrir un message contenant un lien YouTube, cliquer play, confirmer que la vidéo démarre. Idem avec un lien `twitch.tv/<channel>`.

---

## 2. Retries exponentiels sur 429 dans `fetch-url-metadata`

**Fichier : `supabase/functions/fetch-url-metadata/index.ts`**

Encapsuler l'appel `fetch(parsedUrl…)` dans un helper `fetchWithRetry` :

- Maximum 3 tentatives.
- Si la réponse est `429` ou `503` :
  - Lire l'en-tête `Retry-After` (secondes entières ou date HTTP).
  - Si valeur valide et ≤ 4s, attendre cette valeur ; sinon utiliser un backoff exponentiel `300ms · 2^attempt` plafonné à 2000ms avec jitter ±20%.
  - Conserver le timeout global (5s total budget) en partageant le même `AbortController` — si le budget est dépassé, sortir et retourner `{ empty: true, fallback: true }` (200, comportement existant).
- Sur réussite ou autre code, renvoyer la réponse telle quelle.
- Toute exception réseau → retry également jusqu'à la limite.

Le comportement actuel « 200 + `empty:true` + `fallback:true` » sur échec définitif reste inchangé pour ne pas casser le client.

---

## 3. Cache serveur per-URL (TTL configurable)

**Fichier : `supabase/functions/fetch-url-metadata/index.ts`**

Cache **in-memory** par instance d'edge function (suffit pour amortir les rafales et tout réduire à zéro 429 sur les URLs vues récemment) :

```text
Map<urlKey, { payload: object; expiresAt: number; status: 'hit' | 'empty' }>
```

- Clé : `parsedUrl.toString()` (normalisée).
- TTL positif (succès) : `Deno.env.get('URL_METADATA_TTL_OK_SEC')` → défaut **3600s** (1h).
- TTL négatif (empty / erreur upstream) : `Deno.env.get('URL_METADATA_TTL_FAIL_SEC')` → défaut **300s** (5min). Évite le pilonnage d'une URL qui répond 429 en boucle.
- Capacité max : 500 entrées avec éviction LRU naïve (Map garde l'ordre d'insertion, supprime la plus ancienne au-delà du seuil).
- Logique :
  1. Au début (après auth + validation URL), `lookup` dans le cache → si frais, retourner directement la payload mise en cache avec `Cache-Control: public, max-age=<reste>` et un header `X-Cache: HIT`.
  2. Sinon, exécuter le fetch (avec retries de l'étape 2), construire la réponse, puis l'enregistrer dans le cache (positif ou négatif selon le résultat) avant de la retourner.
- Ajouter le header de réponse `X-Cache: HIT|MISS` et `Cache-Control: public, max-age=<ttl restant>` pour cohérence (le client n'en a pas besoin mais facilite le debug).

**Note importante** : le cache mémoire d'edge function se vide au redémarrage / cold start, ce qui est volontaire — pas besoin de table SQL, le cache client existant (`useUrlMetadata.ts` + IndexedDB) reste la première ligne de défense.

---

## Périmètre exclu (volontairement non touché)

- `useUrlMetadata.ts` côté client : cache client déjà en place, pas de changement.
- `useTwitchStatus.ts` : déjà cache + dédoublonnage, hors scope.
- Aucune nouvelle dépendance, aucune migration SQL, aucun secret à provisionner.

---

## Plan de vérification

1. Recharger l'app, ouvrir un message avec un lien YouTube classique → thumbnail visible, play démarre la vidéo.
2. Tester un Short YouTube (`/shorts/<id>`) et un live (`/live/<id>`) → carte 9:16 et badge Live respectivement.
3. Tester un lien `twitch.tv/<channel>` live → badge Live + viewers, play démarre le stream.
4. Provoquer un 429 simulé en envoyant rapidement la même URL externe non vue : observer dans les logs edge function que le retry attend ~`Retry-After`, puis renvoie une réponse exploitable (ou `empty:true` après 3 tentatives).
5. Re-déclencher la même URL dans la minute → header `X-Cache: HIT` dans la réponse, latence quasi nulle, aucun appel sortant.
