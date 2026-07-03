## Diagnostic

Les logs d'auth montrent la vraie cause de l'échec après le consentement :

```
POST /oauth/token → 500
error: "HS256 is not supported for ID token signing"
msg:   "500: Error generating ID token"
```

Le consentement s'est bien passé (`/oauth/authorizations/.../consent → 200 approve`), mais quand Claude échange le code d'autorisation contre un token, Supabase doit émettre un **ID token OpenID Connect**. Le serveur OAuth 2.1 de Supabase **refuse de signer des ID tokens en HS256** (symétrique) — il exige une clé de signature **asymétrique** (RS256/ES256/EdDSA), car un ID token doit être vérifiable par le client via JWKS public.

Or ce projet utilise encore le secret JWT legacy HS256, donc `/oauth/token` renvoie 500 → Claude affiche « Authorization with the MCP server failed » (`ofid_d137c586c123ff99`).

C'est exactement le point noté dans la doc `cloud-auth-oauth-server` : « Empty JWKS or symmetric-only signing blocks standards-based token verification. »

## Correctif

Il faut **faire tourner les clés JWT du projet vers un algorithme asymétrique** pour que Supabase Auth puisse émettre l'ID token OIDC demandé par le flux OAuth.

### Étapes

1. **Rotation des clés API/JWT** du projet Lovable Cloud vers une paire asymétrique (ES256 recommandé, sinon RS256). Utilise l'outil `supabase--rotate_api_keys`. Cela :
   - Publie une clé publique dans le JWKS (`/.well-known/jwks.json`)
   - Permet à `/oauth/token` de signer l'ID token
   - Ne change pas l'anon key publiable côté front
2. **Re-vérifier `supabase--debug_oauth_server`** pour confirmer que l'issuer, le JWKS et la config OAuth sont OK après rotation.
3. **Re-déployer la fonction `mcp`** (`supabase--deploy_edge_functions` sur `["mcp"]`) pour qu'elle recharge la config de vérif de token avec le nouveau JWKS.
4. **Retester depuis Claude** : Connecter → login → approve → doit maintenant recevoir un token et lister les outils du serveur MCP.

### Ce que je ne touche PAS

- Pas de changement dans `src/lib/mcp/**` ni dans les tools — le code MCP est correct.
- Pas de changement dans la route `/.lovable/oauth/consent` — elle marche (consent 200).
- Pas de changement d'issuer — il est déjà bon (`https://ixdznbvbjjnydqttmaam.supabase.co/auth/v1`).

### Détails techniques

- L'endpoint `/oauth/token` de Supabase suit le profil OIDC : l'ID token doit être signé par une clé asymétrique publiée dans JWKS pour respecter RFC 7519 + OIDC Core §2.
- Le legacy JWT secret HS256 reste utilisable pour les tokens de session app classiques, mais **pas** pour le flux OAuth 2.1 exposé aux clients externes (Claude, ChatGPT).
- Après rotation, `mcp-js` continuera de vérifier les bearer tokens via l'issuer discovery — il récupérera la nouvelle clé publique automatiquement.

## Résultat attendu

Après rotation + redeploy, le clic « Connecter » dans Claude enchaîne : login → consent → `/oauth/token` 200 → Claude reçoit access_token → appelle `/mcp` avec bearer → les outils apparaissent.
