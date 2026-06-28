## Plan — Diagnostic ciblé : confirmer que `UserProfileCard.tsx` est bien le composant rendu

Objectif : valider/invalider que le fichier qu'on modifie depuis le début est réellement celui qui affiche la bannière en bas à gauche. Aucun fix dans ce tour.

### Étape 1 — Tag DOM sur `UserProfileCard.tsx`

Ajout temporaire d'un attribut `data-component="UserProfileCard-DIAG"` sur le `<div>` racine retourné par le composant (ligne ~113, le conteneur avec `className="h-full mx-2 mb-2 px-3 py-1 …"`).

```diff
 <div
+  data-component="UserProfileCard-DIAG"
   className={cn(
     "h-full mx-2 mb-2 px-3 py-1 flex items-center gap-2.5 …",
```

### Étape 2 — Log de rendu (pas useEffect)

Juste avant le `return`, ajout d'un `console.log` synchrone à chaque render, throttlé à 500 ms pour ne pas noyer la console :

```ts
const _now = performance.now();
const _w = window as unknown as { __upcRenderLogTs?: number };
if (_now - (_w.__upcRenderLogTs ?? 0) > 500) {
  _w.__upcRenderLogTs = _now;
  console.log('[DIAG UserProfileCard render]', {
    isSpeakingSelf,
    profileId: profile?.id,
    speakingUsersSize: speakingUsers?.size,
    speakingUsersHas: profile?.id ? speakingUsers?.has(profile.id) : null,
  });
}
```

### Étape 3 — Vérification utilisateur

1. Inspecter la bannière en bas à gauche → chercher `data-component="UserProfileCard-DIAG"`.
2. Pendant que tu parles, vérifier les logs `[DIAG UserProfileCard render]` :
   - Si `isSpeakingSelf: true` apparaît mais le halo ne s'affiche pas → bug CSS / classe `ring-…` non appliquée.
   - Si `isSpeakingSelf` reste à `false` alors que `[DIAG VoiceContext.speakingUsers]` montre `willAddLocal: true` → décalage d'ID ou Set figé en aval.
   - Si **aucun** log `[DIAG UserProfileCard render]` n'apparaît pendant que tu parles → le composant n'est pas re-rendu (chaîne de propagation cassée malgré l'audit précédent, ou le composant rendu est un autre).

### Étape 4 — Si l'attribut DOM est absent

Recherche systématique du composant réellement rendu :

```bash
rg -n "avatar.*mic.*headphone|UserAvatarImage.*toggleMute|h-\[60px\]" src/
rg -n "voiceCtx\.toggleMute|toggleDeafen.*voiceCtx" src/components/
```

Cibles candidates : `src/components/mobile/*`, `src/components/layout/VoiceControls.tsx`, `src/components/layout/VoiceStatusBadge.tsx`, ou une version desktop séparée.

### Fichiers à modifier

- `src/components/profile/UserProfileCard.tsx` — ajout `data-component` + log render throttlé.

Aucun autre fichier touché. Logs et attribut à retirer une fois le diagnostic terminé.