

# Fix: Couleur des embeds basee sur les metadonnees

## Probleme

Actuellement, quand un site ne fournit pas de `theme-color` dans ses metadonnees (cas frequent -- YouTube, GitHub, etc.), l'embed utilise un bleu fixe (`#5865F2`) qui ne correspond pas au site. L'utilisateur souhaite que la couleur vienne toujours des metadonnees du site.

## Solution

### 1. Ameliorer l'extraction de couleur dans le backend

**Fichier** : `supabase/functions/fetch-url-metadata/index.ts`

Extraire la couleur depuis plusieurs sources de metadonnees, par ordre de priorite :
1. `meta[name="theme-color"]` (standard)
2. `meta[name="msapplication-TileColor"]` (Microsoft)
3. `meta[property="og:theme_color"]` (variante OG)

Si aucune de ces sources n'est disponible, retourner `null` (le frontend gerera le fallback).

### 2. Fallback neutre dans le composant

**Fichier** : `src/components/chat/LinkEmbed.tsx`

Quand `themeColor` est `null`, utiliser un gris neutre discret (`#202225`) au lieu du bleu `#5865F2`, pour que l'embed reste coherent visuellement sans afficher une fausse couleur de marque.

## Fichiers a modifier

| Fichier | Modification |
|---|---|
| `supabase/functions/fetch-url-metadata/index.ts` | Ajouter extraction `msapplication-TileColor` et `og:theme_color` |
| `src/components/chat/LinkEmbed.tsx` | Changer le fallback de `#5865F2` vers un gris neutre |

