## Diagnostic

L'URL `https://discordbutbetter.lovable.app/.lovable/oauth/consent?authorization_id=...` renvoie la page 404 (NotFound) de l'app, **pas** un vrai 404 serveur.

Cause : la route `/.lovable/oauth/consent` (`OAuthConsent`) est bien enregistrée dans `src/App.tsx` et le composant existe (`src/pages/OAuthConsent.tsx`), **mais le site publié `discordbutbetter.lovable.app` sert encore le bundle d'avant l'intégration MCP**. React Router ne connaît donc pas cette route sur la version en ligne et affiche la page NotFound.

Le serveur OAuth Supabase est bien configuré (vérifié) :
- OAuth server : activé
- Authorization path : `/.lovable/oauth/consent`
- Site URL : `https://discordbutbetter.lovable.app`
- Dynamic client registration : activé
- `discordbutbetter.lovable.app/**` est bien dans l'allow-list

## Solution

**Republier l'app** via le bouton Publish (Update). Aucune modification de code n'est nécessaire — tout est déjà en place côté source. Après republication :

1. L'URL `/.lovable/oauth/consent` chargera correctement l'écran d'approbation.
2. Le flow Claude → « Connecter » affichera la page de consentement au lieu du 404.
3. Après approbation, Claude recevra le token et le serveur MCP sera accessible.

## Vérification après republication

1. Ouvrir directement `https://discordbutbetter.lovable.app/.lovable/oauth/consent?authorization_id=test` → doit afficher un message d'erreur lisible (« Could not load… »), **pas** la page 404.
2. Relancer « Connecter » depuis Claude → écran de consentement NexusChat.
3. Cliquer « Approuver » → retour vers Claude, MCP connecté.

## Note

Si après republication le 404 persiste, il faudra vérifier que `src/pages/NotFound.tsx` ne match pas par erreur sur ce path avant `OAuthConsent`, mais l'ordre actuel des `<Route>` dans `App.tsx` est correct.
