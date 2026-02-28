

# Corriger les bugs de navigation Parametres Serveur sur mobile

## Probleme racine

Le modal des parametres serveur (`ServerSettingsModal`) depend de `currentServerId` pour s'afficher (ligne 394 de MobileLayout). Or `currentServerId` est derive de `mobileView` qui doit etre de type `channels`, `chat` ou `thread`. Quand l'utilisateur est sur l'onglet serveurs (`mobileView.type === 'tab'`), `currentServerId` est `null` et le modal ne s'affiche jamais.

L'etat `showServerSettings = true` reste en memoire. Quand l'utilisateur clique ensuite sur un salon, `mobileView` passe a `chat`, `currentServerId` devient valide, et le modal des parametres apparait a la place du chat.

## Solution

Stocker le `serverId` pour les parametres dans un state dedie au lieu de dependre de `currentServerId`.

### Modification dans `src/components/mobile/MobileLayout.tsx`

1. Remplacer `showServerSettings` (boolean) par `settingsServerId` (string | null) :
   - `null` = modal ferme
   - une valeur = modal ouvert pour ce serveur

2. Mettre a jour les deux endroits ou les parametres sont ouverts :
   - Depuis l'onglet serveurs (ligne 349) : passer `activeServerId`
   - Depuis la liste de salons (ligne 325) : passer `mobileView.serverId`

3. Mettre a jour le rendu du modal (ligne 394-400) : utiliser `settingsServerId` pour trouver le serveur et afficher le modal, sans dependre de `currentServerId`.

### Detail technique

**Avant** :
```tsx
const [showServerSettings, setShowServerSettings] = useState(false);
// ...
onOpenSettings={() => setShowServerSettings(true)}
// ...
{showServerSettings && currentServerId && currentServer && (
  <ServerSettingsModal serverId={currentServerId} ... onClose={() => setShowServerSettings(false)} />
)}
```

**Apres** :
```tsx
const [settingsServerId, setSettingsServerId] = useState<string | null>(null);
// ...
// Onglet serveurs :
onOpenSettings={() => activeServerId && setSettingsServerId(activeServerId)}
// Liste salons :
onOpenSettings={() => setSettingsServerId(mobileView.serverId)}
// ...
{settingsServerId && (() => {
  const settingsServer = rawServers.find(s => s.id === settingsServerId);
  return settingsServer ? (
    <ServerSettingsModal serverId={settingsServerId} serverName={settingsServer.name} onClose={() => setSettingsServerId(null)} />
  ) : null;
})()}
```

## Fichier modifie

| Fichier | Changement |
|---------|-----------|
| `src/components/mobile/MobileLayout.tsx` | Remplacer `showServerSettings` boolean par `settingsServerId` string, corriger les callbacks et le rendu du modal |

## Resultat attendu

- Cliquer sur l'engrenage ouvre immediatement les parametres du serveur selectionne
- Cliquer sur un salon ouvre bien le chat, pas les parametres
- Fermer les parametres (croix) revient proprement a la vue precedente sans crash

