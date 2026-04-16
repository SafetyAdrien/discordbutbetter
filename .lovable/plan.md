

# Import serveur : icône et bannière Discord

## Problème
L'edge function `import-discord-template` ne récupère pas l'icône ni la bannière du template Discord. Le `handleImportFinalize` crée le serveur sans `icon_url` ni `banner_url`.

## Solution

### 1. Edge function (`supabase/functions/import-discord-template/index.ts`)
- Extraire `guild.icon_hash` et construire l'URL CDN Discord : `https://cdn.discordapp.com/guilds/${template.source_guild_id}/icons/${icon_hash}.png?size=512`
- Extraire `guild.splash_hash` (bannière) : `https://cdn.discordapp.com/splashes/${template.source_guild_id}/${splash_hash}.png?size=1024`
- Note : les templates Discord exposent `source_guild_id` et `serialized_source_guild.icon_hash`. Si `icon_hash` est absent, utiliser `null`.
- Retourner `iconUrl` et `bannerUrl` dans le résultat JSON.

### 2. CreateServerModal (`src/components/modals/CreateServerModal.tsx`)
- Dans `handleImportFinalize`, après récupération de `importedData.iconUrl` et `importedData.bannerUrl` :
  - Si une URL d'icône existe : fetch l'image depuis le CDN Discord (via l'edge function pour éviter CORS), upload dans le bucket `server-icons`, et passer l'URL publique au `insert` du serveur.
  - Idem pour la bannière dans `server-banners`.
- Mettre à jour le type `ImportedTemplate` pour inclure `iconUrl` et `bannerUrl`.
- Afficher un aperçu de l'icône/bannière dans l'étape `import-preview`.

### 3. Edge function — proxy d'image (optionnel mais nécessaire pour CORS)
- Ajouter une route ou une seconde fonction pour proxifier le téléchargement d'image Discord, ou bien faire le fetch + upload vers le storage directement dans l'edge function existante en utilisant le service role key.

### Approche retenue (plus simple)
L'edge function fait tout côté serveur :
1. Fetch l'icône Discord si disponible
2. Upload dans le bucket `server-icons` avec le service role key
3. Retourne l'URL publique du storage dans le résultat

Cela évite les problèmes CORS et simplifie le client.

## Fichiers modifiés
- `supabase/functions/import-discord-template/index.ts` — extraire icon/banner, fetch et upload dans storage
- `src/components/modals/CreateServerModal.tsx` — utiliser `iconUrl`/`bannerUrl` retournées, les afficher dans le preview et les passer à l'insert serveur

