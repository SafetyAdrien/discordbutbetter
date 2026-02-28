

# Transformer NexusChat en Web App installable (PWA)

## Ce que ca change pour vous

Votre application pourra etre **installee directement depuis le navigateur** sur l'ecran d'accueil de n'importe quel telephone (iPhone ou Android), comme une vraie application native. Elle se lancera en plein ecran, fonctionnera hors connexion pour les pages deja visitees, et se chargera instantanement.

## Etapes

### 1. Installer le plugin PWA pour Vite
Ajout de la dependance `vite-plugin-pwa` qui genere automatiquement le Service Worker et le manifeste.

### 2. Configurer le plugin dans `vite.config.ts`
- Activation du mode `autoUpdate` pour que l'app se mette a jour automatiquement
- Configuration du manifeste (nom, couleurs, icones)
- Exclusion de la route `/~oauth` du cache du Service Worker (necessaire pour l'authentification)
- Pre-cache des pages et assets statiques

### 3. Creer les icones PWA
Ajout de fichiers d'icones dans le dossier `public/` :
- `pwa-192x192.png` (192x192)
- `pwa-512x512.png` (512x512)
- `apple-touch-icon-180x180.png` (180x180 pour iOS)

Ces icones seront generees a partir du favicon existant avec un fond adapte au theme sombre de l'app.

### 4. Mettre a jour `index.html`
Ajout des meta tags PWA necessaires :
- `<meta name="theme-color">` pour la couleur de la barre de statut
- `<meta name="apple-mobile-web-app-capable">` pour le mode standalone sur iOS
- `<meta name="apple-mobile-web-app-status-bar-style">` pour la barre sombre
- `<link rel="apple-touch-icon">` pour l'icone iOS

### 5. Creer une page `/install`
Page dediee qui detecte si l'app est deja installee et propose un bouton d'installation avec des instructions adaptees selon le navigateur (Chrome, Safari, etc.).

---

## Details techniques

### `vite.config.ts` - Configuration PWA

```typescript
import { VitePWA } from 'vite-plugin-pwa';

// Ajout dans plugins[]
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    navigateFallbackDenylist: [/^\/~oauth/],
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,otf}'],
  },
  manifest: {
    name: 'NexusChat - Messagerie Gaming',
    short_name: 'NexusChat',
    description: 'Messagerie et VoIP pour gamers',
    theme_color: '#1a1a2e',
    background_color: '#1a1a2e',
    display: 'standalone',
    orientation: 'portrait',
    start_url: '/',
    icons: [
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
})
```

### Fichiers concernes

| Fichier | Action |
|---------|--------|
| `package.json` | Ajout dependance `vite-plugin-pwa` |
| `vite.config.ts` | Configuration du plugin PWA |
| `index.html` | Meta tags PWA + Apple |
| `public/pwa-192x192.png` | Icone 192px |
| `public/pwa-512x512.png` | Icone 512px |
| `public/apple-touch-icon-180x180.png` | Icone Apple |
| `src/pages/Install.tsx` | Page d'installation |
| `src/App.tsx` | Route `/install` |

