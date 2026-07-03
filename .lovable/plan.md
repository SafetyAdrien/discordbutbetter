## Corrections de sécurité

### 1. LiveKit — Empêcher l'usurpation d'identité (`livekit_identity_spoof`)

**Fichier:** `supabase/functions/livekit-token/index.ts`
- Ignorer `body.identity` et forcer `identity = userData.user.id` (identité serveur uniquement).
- Ignorer aussi `body.adminRoom` (déjà non utilisé côté serveur, mais on nettoie).

**Fichier:** `src/lib/livekit.ts`
- Retirer le paramètre `identity` de `fetchLiveKitToken` et `connectToLiveKitRoom`.
- Retirer l'option `adminRoom` de l'interface publique et du body envoyé.

**Fichier:** `src/hooks/useLiveKit.ts` (et autres appelants éventuels)
- Retirer tout passage de `identity`/`adminRoom` aux helpers.

### 2. fetch-url-metadata — SSRF via redirections (`ssrf_redirect_bypass`)

**Fichier:** `supabase/functions/fetch-url-metadata/index.ts`
- Extraire la validation d'hôte privé actuelle dans une fonction `isPrivateHostname(hostname)` réutilisable.
- Ajouter la plage CGNAT `100.64.0.0/10` (`100.64.` à `100.127.`) et rejeter les représentations numériques/octales/hex d'IP (via parsing: si `hostname` est purement numérique ou `0x…`, refuser).
- Modifier `fetchWithRetry` pour passer `redirect: 'manual'`:
  - Si status 3xx, lire `Location`, résoudre en URL absolue par rapport à l'URL courante, revalider protocole (`http/https`) + `isPrivateHostname`, puis re-`fetch` manuellement.
  - Limiter à 5 redirections max, en respectant le budget global de 5 s.
  - En cas d'échec de validation d'un hop, retourner `{ upstreamStatus: null }` (traité comme fallback vide).

Aucun changement UI, aucune migration DB. Les corrections restent isolées aux edge functions et à la couche client LiveKit.

### Détails techniques

- LiveKit: le grant vidéo reste inchangé (roomJoin, canPublish, canSubscribe, canPublishData, room). Seule la source d'`identity` change.
- SSRF: la revalidation par hop couvre aussi les redirections en chaîne A→B→interne. Les IPv4 en forme décimale (`2130706433`), octale (`0177.0.0.1`) et hex (`0x7f000001`) sont rejetées avant tout `fetch`.
