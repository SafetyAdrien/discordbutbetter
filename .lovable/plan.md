

# Fix: page blanche lors du clic sur l'engrenage paramètres serveur (mobile)

## Cause

`onOpenSettings('')` passe une chaîne vide `''` comme `initialTab`. Dans `ServerSettingsModal`, l'opérateur `??` ne traite pas `''` comme nul, donc `activeTab` est initialisé à `''` — aucun onglet ne correspond, d'où la page vide.

## Correction

### `src/components/mobile/MobileChannelListView.tsx`

Remplacer les 3 appels `onOpenSettings('')` par `onOpenSettings()` (sans argument), pour que `initialTab` soit `undefined` et que le `??` fonctionne correctement (affichant la liste de navigation sur mobile).

