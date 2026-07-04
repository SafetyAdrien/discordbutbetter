---
name: Auth contract
description: Règles inviolables pour ne pas casser le login (AuthContext, guards, hooks)
type: constraint
---
Ne jamais modifier `src/contexts/AuthContext.tsx` sans respecter ces 5 règles.

1. **Aucun `await` dans `onAuthStateChange`** — fire-and-forget uniquement, sinon deadlock des events auth suivants.
2. **Ordre d'enregistrement** : `supabase.auth.onAuthStateChange(...)` AVANT `supabase.auth.getSession()`.
3. **`setLoading(false)` doit toujours être atteint** — le safety net 4s est obligatoire (mobile Safari/PWA peut wedger `getSession`).
4. **Ne jamais lire `user`/`session` avant `loading === false`** — utiliser `useAuthReady()` (`src/hooks/useAuthReady.ts`) et gater les queries via `enabled: isReady && !!user`.
5. **Toute mutation du profil** passe par `updateProfile` / `updateStatus` du context — jamais un `supabase.from('profiles').update(...)` direct dans un composant.

**Routes protégées** : toujours envelopper dans `<RequireAuth>` (`src/components/auth/RequireAuth.tsx`). Ne pas remplacer par des redirects ad-hoc dans les pages.

**Résilience session** : si `getSession()` renvoie null mais qu'un token `sb-*-auth-token` existe en localStorage, attendre `INITIAL_SESSION` de `onAuthStateChange` (jusqu'au safety net) plutôt que basculer en logout immédiat.

**Why:** chaque implémentation passée a cassé le login en violant l'une de ces règles (await, requête RLS trop tôt, redirect qui court-circuite le loading).
