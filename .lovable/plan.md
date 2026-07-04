## Objectif

Le fichier `src/contexts/AuthContext.tsx` fonctionne correctement aujourd'hui (session restaurée via `getSession` + `onAuthStateChange`, safety net 4s, cache profil). Le vrai risque n'est pas le code actuel — c'est qu'une future implémentation le casse par inadvertance (await dans `onAuthStateChange`, requête avant session prête, redirection cassée, etc.).

Ce plan met en place **des garde-fous permanents** autour du login, sans changer son comportement visible.

---

## Ce que je vais faire

### 1. Geler le contrat d'authentification
- Ajouter un en-tête « CRITICAL — DO NOT MODIFY without reading … » en haut de `AuthContext.tsx` documentant les 5 règles inviolables :
  1. Jamais d'`await` (hors "fire and forget") dans `onAuthStateChange`.
  2. `getSession` + `onAuthStateChange` sont enregistrés dans cet ordre.
  3. `setLoading(false)` doit toujours être appelé (safety net 4s conservé).
  4. Aucun composant ne doit lire `session/user` avant que `loading === false`.
  5. Toute mutation du profil passe par `updateProfile` / `updateStatus`.
- Enregistrer ces règles dans `mem://architecture/auth-contract` pour que toute session future les respecte automatiquement.

### 2. Ajouter un hook central `useAuthReady()`
- Nouveau fichier `src/hooks/useAuthReady.ts` qui expose `{ user, session, isReady }` en dérivant de `AuthContext`.
- `isReady` = `!loading` (source unique de vérité).
- À utiliser dans tout nouveau hook Supabase via `enabled: isAuthReady && !!user` pour éliminer les race conditions RLS (`auth.uid() === null`).

### 3. Créer un composant `<RequireAuth>` réutilisable
- `src/components/auth/RequireAuth.tsx` : affiche `LoadingScreen` pendant `authLoading`, redirige vers `/auth` si pas d'utilisateur, sinon rend les enfants.
- Envelopper toutes les routes protégées dans `App.tsx` (`/`, `/admin/badges`, `/install`, etc.) — les redirections ad-hoc dans `Index.tsx` restent en fallback.
- Bénéfice : plus jamais de « page blanche » ou de « je vois brièvement la page avant redirect » lors d'un ajout de route.

### 4. Sauvegarde/récupération de session résiliente
- Ajouter dans `AuthContext` une double vérification : si `getSession()` renvoie `null` mais que `localStorage` contient un token Supabase valide (clé `sb-*-auth-token`), attendre l'événement `INITIAL_SESSION` de `onAuthStateChange` avant de basculer `loading=false` (jusqu'à la limite du safety net).
- Évite les faux « déconnexions » sur mobile Safari / PWA après implémentations.

### 5. Test de fumée automatisé
- Ajouter `tests/auth-smoke.spec.ts` (Playwright, exécutable via `bunx playwright test`) :
  1. Charger `/` sans session → doit rediriger vers `/auth` en < 5s.
  2. Charger `/auth` → formulaire visible, pas d'erreur console.
  3. Charger `/` avec session injectée en `localStorage` → page principale visible, pas de redirect.
- Documenté dans `README.md` comme « à lancer avant tout merge touchant à l'auth ».

### 6. Mémoire projet
- Créer `mem://architecture/auth-contract` listant les 5 règles + le fait qu'il faut utiliser `useAuthReady` et `<RequireAuth>`.
- Ajouter une ligne Core dans `mem://index.md` : « Auth : ne jamais modifier `AuthContext.tsx` sans lire `mem://architecture/auth-contract`. `useAuthReady` + `<RequireAuth>` obligatoires. »

---

## Ce que je NE touche PAS

- Le flux visuel de `/auth` (design, textes, providers).
- Les icônes de copie, les badges, ou tout code hors authentification.
- Le schéma DB, les policies RLS, la configuration OAuth managée.
- Le comportement actuel du login (aucun changement visible pour l'utilisateur).

---

## Détails techniques

```text
src/
├── contexts/AuthContext.tsx        ← en-tête + double check localStorage
├── hooks/useAuthReady.ts           ← NEW
├── components/auth/RequireAuth.tsx ← NEW
└── App.tsx                         ← wrap routes protégées
tests/auth-smoke.spec.ts            ← NEW (Playwright)
mem://architecture/auth-contract    ← NEW
mem://index.md                      ← +1 ligne Core
```

Aucune migration DB. Aucune dépendance ajoutée (Playwright déjà dispo dans le sandbox).
