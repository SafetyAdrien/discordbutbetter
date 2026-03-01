

# Fix: Embeds de liens avec metadonnees

## Diagnostic

Le backend (edge function `fetch-url-metadata`) fonctionne correctement -- teste avec GitHub et YouTube, il retourne bien les metadonnees (titre, description, image, couleur du theme, nom du site).

Le composant `LinkEmbeds` detecte les URLs et affiche un squelette de chargement, mais l'appel au backend depuis le frontend semble echouer silencieusement (erreurs capturees sans log).

## Corrections prevues

### 1. Ajouter du logging dans le hook `useUrlMetadata.ts`
- Ajouter des `console.log` / `console.error` dans la fonction `fetchMetadata` pour identifier pourquoi l'appel echoue cote frontend
- Verifier que `supabase.functions.invoke` retourne bien les donnees attendues et pas un format encapsule different

### 2. Corriger le traitement de la reponse dans `useUrlMetadata.ts`
- Le SDK Supabase peut encapsuler la reponse differemment selon la version. Verifier si `data` contient directement les metadonnees ou si elles sont dans `data.data`
- Ajouter une gestion robuste du format de reponse

### 3. Ameliorer le composant `LinkEmbed.tsx`
- Ajouter un etat d'erreur visible en mode developpement
- S'assurer que le composant ne reste pas bloque sur le squelette de chargement indefiniment (timeout de secours)

---

## Detail technique

### Fichier : `src/hooks/useUrlMetadata.ts`

Modifications dans `fetchMetadata()` :
- Ajouter `console.log('Fetching metadata for:', url)` avant l'appel
- Ajouter `console.log('Metadata response:', data, error)` apres l'appel
- Gerer le cas ou la reponse est dans `data.data` plutot que `data` directement
- Ajouter un timeout de 10 secondes pour eviter que le composant reste en chargement

### Fichier : `src/components/chat/LinkEmbed.tsx`

- Aucun changement majeur necessaire, le composant affiche deja correctement les donnees quand elles arrivent

### Fichiers concernes

| Fichier | Action |
|---|---|
| `src/hooks/useUrlMetadata.ts` | Ajouter logging + corriger traitement reponse |
| `src/components/chat/LinkEmbed.tsx` | Ajouter timeout de secours sur le chargement |

