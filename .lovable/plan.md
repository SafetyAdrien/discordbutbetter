

# Plan : Sous-listes imbriquees et Embeds de liens avec metadonnees

## 1. Sous-listes imbriquees avec puces differenciees

### Probleme actuel
Les listes utilisent toutes `list-disc` (point plein) quel que soit le niveau d'indentation. Discord affiche des puces differentes selon la profondeur :
- Niveau 0 : disc (point plein)
- Niveau 1 : circle (cercle vide) 
- Niveau 2+ : square (carre)

### Changement
**Fichier** : `src/lib/markdown.tsx` (lignes 710-716)

Remplacer le style fixe `list-disc` par un style dynamique base sur `indentLevel` :
- `indentLevel === 0` : `list-disc`
- `indentLevel === 1` : `list-[circle]`
- `indentLevel >= 2` : `list-[square]`

---

## 2. Embeds de liens avec metadonnees Open Graph

### Fonctionnement
Quand un message contient une URL brute (auto-link), un composant embed s'affiche sous le message. Cet embed recupere les metadonnees du site (og:title, og:description, og:image, theme-color) via une fonction backend et les affiche dans un bloc stylise avec :
- Barre laterale coloree (couleur du site ou couleur par defaut)
- Titre du site (cliquable)
- Description
- Image miniature (si disponible)
- Nom du site source

### Implementation

#### A. Fonction backend : `fetch-url-metadata`
**Fichier** : `supabase/functions/fetch-url-metadata/index.ts`

- Recoit une URL en POST
- Fetch la page HTML cote serveur
- Extrait les balises meta Open Graph (`og:title`, `og:description`, `og:image`, `og:site_name`, `theme-color`) par parsing HTML
- Retourne un objet JSON avec les metadonnees
- Gestion des erreurs (timeout, URL invalide, pas de metadata)

#### B. Composant `LinkEmbed`
**Fichier** : `src/components/chat/LinkEmbed.tsx` (nouveau)

- Recoit une URL en prop
- Appelle la fonction backend pour recuperer les metadonnees
- Affiche un embed style Discord :
  - Barre gauche coloree (theme-color du site ou bleu par defaut)
  - Nom du site source en petit texte
  - Titre cliquable (lien vers l'URL)
  - Description (tronquee a 300 caracteres)
  - Image miniature a droite ou en bas selon la taille
- Etats de chargement (skeleton) et d'erreur (pas d'embed affiche)
- Cache en memoire pour eviter les appels repetes

#### C. Integration dans le rendu des messages
**Fichier** : `src/lib/markdown.tsx`

- Apres le rendu du message, collecter toutes les URLs auto-linkees
- Passer ces URLs au composant parent pour afficher les embeds sous le message

**Fichier** : `src/components/chat/ChatArea.tsx` (et `DMConversation.tsx`)

- Detecter les URLs dans le contenu du message
- Afficher les composants `LinkEmbed` sous chaque message contenant des URLs
- Limiter a 5 embeds maximum par message

---

## Detail technique

### Fonction backend (`fetch-url-metadata`)

```text
POST /fetch-url-metadata
Body: { url: string }
Response: {
  title?: string,
  description?: string,
  image?: string,
  siteName?: string,
  themeColor?: string,
  favicon?: string
}
```

La fonction :
- Fait un fetch HTTP de l'URL avec un timeout de 5 secondes
- Parse le HTML pour extraire les meta tags via regex (pas de DOM parser cote Deno)
- Tags cherches : `og:title`, `og:description`, `og:image`, `og:site_name`, `twitter:title`, `twitter:description`, `twitter:image`, `meta[name=theme-color]`, `meta[name=description]`, `<title>`
- Fallback : `twitter:*` si `og:*` absent, puis `<title>` et `meta[name=description]`

### Composant LinkEmbed

```text
+--+------------------------------------+
|  | siteName                           |
|C | Titre (lien cliquable)        [img]|
|O | Description tronquee...            |
|L |                                    |
+--+------------------------------------+
```

- Barre gauche : 4px, couleur = themeColor ou `#5865F2`
- Fond : `bg-[#2b2d31]` 
- Largeur max : 520px (comme Discord)
- Image : thumbnail a droite (80x80) si petite, ou en bas pleine largeur si grande

### Hook `useUrlMetadata`
**Fichier** : `src/hooks/useUrlMetadata.ts` (nouveau)

- Cache en memoire (Map globale URL -> metadata)
- Appel a la fonction backend via `supabase.functions.invoke`
- Retourne `{ data, isLoading, error }`

### Fichiers concernes (resume)

| Fichier | Action |
|---|---|
| `src/lib/markdown.tsx` | Puces differenciees par niveau d'indentation |
| `supabase/functions/fetch-url-metadata/index.ts` | Nouvelle fonction backend pour extraire les meta OG |
| `src/components/chat/LinkEmbed.tsx` | Nouveau composant d'affichage embed |
| `src/hooks/useUrlMetadata.ts` | Nouveau hook pour fetch + cache des metadonnees |
| `src/components/chat/ChatArea.tsx` | Integration des embeds sous les messages |
| `src/components/dm/DMConversation.tsx` | Integration des embeds dans les DMs |

