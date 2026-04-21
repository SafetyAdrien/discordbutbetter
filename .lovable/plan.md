

# Installation de l'app sur mobile (PWA)

L'app est déjà configurée comme PWA via `vite-plugin-pwa` (manifest, service worker, icônes). Il manque toutefois l'expérience d'installation : un bouton/page accessible permettant à l'utilisateur d'ajouter l'app à son écran d'accueil mobile, et l'intégration dans la navigation mobile.

## Ce que l'utilisateur verra

### 1. Page d'installation `/install`
- Hero avec icône de l'app, titre "Installer BCord" et description courte
- Détection automatique de la plateforme :
  - **Android / Chrome desktop** : bouton **"Installer l'application"** qui déclenche le prompt natif (`beforeinstallprompt`)
  - **iOS Safari** : tutoriel visuel pas-à-pas (icône Partager → "Sur l'écran d'accueil")
  - **Autres navigateurs** : instructions génériques (menu ⋮ → Installer)
- État "Déjà installée" si l'app tourne en mode `standalone` (avec CTA "Ouvrir BCord")
- Liste des bénéfices : plein écran, accès rapide depuis l'écran d'accueil, fonctionne hors-ligne, notifications

### 2. Bannière d'installation contextuelle (mobile uniquement)
- Apparaît en bas de l'écran sur mobile la première fois que `beforeinstallprompt` se déclenche
- Texte : "Ajoute BCord à ton écran d'accueil pour un accès instantané"
- Boutons : **"Installer"** + **"Plus tard"** (× pour fermer)
- État masqué persistant en `localStorage` (`pwa-install-dismissed`) — réapparaît au bout de 7 jours si refusée
- Ne s'affiche jamais si déjà installée

### 3. Entrée dans le menu Profil mobile
- Nouvel item dans `MobileProfileView` : **"Installer l'application"** (icône Download)
- Caché si déjà en mode standalone
- Tap → navigation vers `/install`

### 4. Configuration native mobile
- Métadonnées `apple-mobile-web-app-*` (déjà partiellement présentes, vérification + ajout du `apple-touch-icon` 180×180)
- `theme-color` cohérent avec la charte (déjà `#1a1a2e`)
- Splash screen via couleurs du manifest existant
- Mode d'affichage `standalone` (déjà configuré)
- Orientation `portrait` (déjà configuré)
- Safe-area respectée partout (déjà géré via `viewport-fit=cover`)

### 5. Comportement post-installation
- Lancement plein écran sans barre du navigateur
- Icône sur l'écran d'accueil avec le logo BCord
- Garde la session connectée (cookies/localStorage persistants)
- OAuth fonctionne (la denylist `/~oauth` du service worker est déjà en place)

## Détails techniques

**Fichiers créés**
- `src/pages/Install.tsx` — page d'installation avec détection plateforme et tutoriels
- `src/components/pwa/PWAInstallPrompt.tsx` — bannière contextuelle bas d'écran
- `src/hooks/usePWAInstall.ts` — hook centralisé : capture `beforeinstallprompt`, expose `canInstall`, `isInstalled`, `isIOS`, `promptInstall()`

**Fichiers modifiés**
- `src/App.tsx` — ajout de la route `/install` + montage global de `<PWAInstallPrompt />` (rendu conditionnel mobile)
- `src/components/mobile/MobileProfileView.tsx` — ajout de l'entrée "Installer l'application"
- `index.html` — vérification/ajout des `<link rel="apple-touch-icon">` et meta iOS manquantes
- `vite.config.ts` — vérifier que le manifest contient bien `name`, `short_name`, `description`, `icons` (192, 512, maskable), `display: standalone`, `start_url`, `theme_color`, `background_color` (déjà OK, simple revue)

**Hook `usePWAInstall`**
```ts
- Listener sur `window.beforeinstallprompt` (preventDefault + stockage du prompt)
- Détection iOS : regex sur `navigator.userAgent`
- Détection installée : `matchMedia('(display-mode: standalone)')` + `navigator.standalone`
- `promptInstall()` : appelle `prompt.prompt()` puis `prompt.userChoice`
- Listener `appinstalled` pour mettre à jour l'état
```

**Stockage local**
- `pwa-install-dismissed` : timestamp ISO du dernier refus (réaffiche après 7j)

**Service worker / PWA**
- Configuration `vite-plugin-pwa` déjà en place — aucun changement requis
- `navigateFallbackDenylist: [/^\/~oauth/]` déjà présent (OAuth préservé)
- Garde anti-iframe **non nécessaire** : projet déjà déployé en prod (`discordbutbetter.lovable.app`), le SW ne s'enregistre que sur des domaines réels

**Aucune migration DB requise.**

