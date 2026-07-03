Je vais corriger le cas où l'URL de consentement OAuth affiche encore le 404 après publication.

Plan :
1. Mettre à jour la configuration PWA pour exclure aussi `/.lovable/oauth/*` du cache/navigation fallback, pas seulement `/~oauth`.
2. Faire en sorte que les clients déjà publiés ne restent pas bloqués sur un ancien service worker qui sert l'ancien bundle 404.
3. Vérifier que la route `/.lovable/oauth/consent` reste bien déclarée dans l'app et que `/auth?next=...` conserve le retour vers Claude après connexion.
4. Publier ensuite la nouvelle version pour remplacer le bundle/service worker en production.

Détail technique : le site publié charge maintenant bien l'app, mais le navigateur peut encore recevoir l'ancien écran 404 via le cache PWA/service worker. L'exclusion doit couvrir `/.lovable/oauth` pour que le flux Claude arrive toujours sur le vrai consent screen.