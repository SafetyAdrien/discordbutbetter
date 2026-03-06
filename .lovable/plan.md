

# Optimisation du temps de chargement

## Problèmes identifiés

1. **Exécution séquentielle** : Les étapes 1-6 s'exécutent les unes après les autres (profil → channels → members → permissions → DMs → channel perms), alors que la plupart peuvent tourner en parallèle dès que les serveurs sont chargés.

2. **Délai minimum artificiel** : `getMinLoadingMs()` impose 1.5-4s d'attente même quand tout est déjà en cache sessionStorage. Inutile après le premier chargement.

3. **Trop de requêtes messages** : Le preloader charge les messages de TOUS les channels texte de TOUS les serveurs. Sur un utilisateur avec 5 serveurs × 20 channels = 100 requêtes réseau simultanées.

4. **Pas de court-circuit sessionStorage** : Le preloader refait toutes les requêtes même si les données sont déjà en sessionStorage depuis le dernier F5.

## Plan d'optimisation

### Fichier : `src/hooks/usePreloader.ts`

**A. Paralléliser les étapes indépendantes**

Actuellement : profil → channels → members → permissions → DMs → channelPerms → messages (séquentiel)

Nouveau : après `serversLoaded`, lancer en parallèle :
- Groupe 1 : profil + serverOrder
- Groupe 2 : channels (tous serveurs)
- Groupe 3 : members (tous serveurs)  
- Groupe 4 : roles/permissions (tous serveurs)
- Groupe 5 : DMs
- Groupe 6 : channelPerms

Puis après channels+DMs résolus → messages en parallèle.

**B. Court-circuit sessionStorage**

Avant chaque requête réseau, vérifier si sessionStorage a déjà les données. Si oui, seeder le queryClient directement et skip la requête. Cela rend le preloader quasi-instantané après un F5.

```ts
// Pattern pour chaque étape
const cached = sessionStorage.getItem(`cache:channels:${sid}`);
if (cached) {
  queryClient.setQueryData(['channels', sid], JSON.parse(cached));
  // skip fetch
} else {
  // fetch from supabase
}
```

**C. Supprimer le délai minimum artificiel**

Remplacer `getMinLoadingMs()` par une détection : si toutes les données viennent du sessionStorage, `minTimePassed = true` immédiatement. Sinon, garder un délai réduit (800ms) juste pour éviter un flash.

```ts
const [minTimePassed, setMinTimePassed] = useState(false);
// Si cache hit → immédiat, sinon 800ms
useEffect(() => {
  const hasCache = sessionStorage.getItem('cache:preloader-done');
  if (hasCache) { setMinTimePassed(true); return; }
  const timer = setTimeout(() => setMinTimePassed(true), 800);
  return () => clearTimeout(timer);
}, []);
// Marquer le cache à la fin du preload
// sessionStorage.setItem('cache:preloader-done', '1');
```

**D. Limiter le preload messages aux channels récents**

Au lieu de charger les 100 messages de TOUS les channels, ne precharger que :
- Le channel actuellement actif (depuis navigationState)
- Les 5 derniers channels visités par serveur (stockés en sessionStorage)
- Tous les DM conversations (généralement peu nombreux)

Les autres channels auront leurs messages en sessionStorage s'ils ont été visités, ou se chargeront à la demande.

## Résumé des gains attendus

- **F5 avec cache** : quasi-instantané (< 200ms) au lieu de 1.5-4s
- **Premier chargement** : ~40% plus rapide grâce à la parallélisation
- **Moins de requêtes** : ~10-15 requêtes messages au lieu de 50-100+

