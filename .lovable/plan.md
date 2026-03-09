

# Refonte de la suppression de serveur

## Problème 1 : Le serveur ne disparaît pas immédiatement
Après suppression, le code attend l'invalidation du cache via Realtime (~300ms debounce + refetch). Il faut retirer le serveur du cache React Query immédiatement (optimistic update).

## Problème 2 : Remplacer la saisie du nom par le mot de passe
Au lieu de taper le nom du serveur, le propriétaire doit entrer son mot de passe. On vérifie via `supabase.auth.signInWithPassword` avant d'appeler la RPC de suppression.

## Changements

### `src/components/server-settings/ServerDeletePage.tsx`
- Remplacer le champ `confirmText` (nom du serveur) par un champ `password` (mot de passe)
- Utiliser le composant `PasswordInput` existant
- Avant d'appeler `delete_server_as_owner`, vérifier le mot de passe avec `supabase.auth.signInWithPassword({ email, password })`
- Si le mot de passe est incorrect, afficher une erreur sans procéder à la suppression
- Après suppression réussie : retirer le serveur du cache via `queryClient.setQueryData(['servers'], ...)` pour disparition instantanée, puis `onClose()`
- Le secondaire owner garde le même flux (demande de suppression) mais avec vérification du mot de passe aussi

### `src/hooks/useServers.ts`
- Nettoyer aussi le `sessionStorage` du cache serveurs après suppression (géré implicitement par l'effet existant ligne 172)

## Flux utilisateur final
1. Propriétaire clique "Supprimer le serveur"
2. Entre son mot de passe dans un champ sécurisé
3. Clique sur "Supprimer le serveur" → boîte de confirmation
4. Confirme → vérification mot de passe → suppression → serveur disparaît instantanément

