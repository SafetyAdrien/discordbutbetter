

# Navigation historique (bouton retour) et restauration de session

## Contexte

L'application utilise une seule route `/` et gere toute la navigation via du state React. Le bouton "retour" du navigateur/PWA ne fait rien actuellement, et seul `activeServerId`, `activeDMId` et `channelsByServer` sont persistes dans localStorage.

## Approche

Utiliser l'API `history.pushState` / `popstate` pour empiler des entrees dans l'historique du navigateur a chaque navigation significative, et ecouter le `popstate` pour revenir en arriere. Etendre `useNavigationState` pour persister l'etat complet (onglet mobile, vue mobile, thread, channel actif).

---

## 1. Creer un hook `useHistoryNavigation`

**Nouveau fichier** : `src/hooks/useHistoryNavigation.ts`

Ce hook centralise la gestion de l'historique du navigateur :

- **`pushView(viewState)`** : appelle `history.pushState(viewState, '')` pour empiler un etat
- **`onPopState(callback)`** : ecoute l'evenement `popstate` et appelle le callback avec l'etat precedent
- A l'initialisation, pousse l'etat actuel avec `history.replaceState`

L'etat stocke dans history contient : `{ serverId, channelId, dmId, mobileView, activeTab, threadId }`.

## 2. Integration mobile (`MobileLayout.tsx`)

- Importer `useHistoryNavigation`
- A chaque changement de `mobileView` (channels, chat, thread) et `activeTab`, appeler `pushView` avec le nouvel etat
- Ecouter `popstate` : quand l'utilisateur appuie sur retour, restaurer le `mobileView` et `activeTab` depuis l'etat depile
- Ne PAS empiler quand c'est un retour (flag `isPopNavigation` via ref)

Flux concret :
- Tab "Serveurs" -> ouvre channels -> ouvre chat -> ouvre thread = 3 entrees empilees
- Bouton retour : thread -> chat -> channels -> tab

## 3. Integration desktop (`Index.tsx`)

- Importer `useHistoryNavigation`
- Empiler lors de : changement de serveur, changement de channel, ouverture/fermeture DM, ouverture de thread
- Ecouter `popstate` : restaurer `activeServerId`, `activeChannelId`, `activeDMId`, `activeThreadId`

## 4. Etendre la persistence (`useNavigationState.ts`)

Ajouter au state persiste :
- `activeChannelId` (desktop)
- `activeThreadId` et `threadChannelId` (desktop)
- `mobileView` (type + serverId + channelId + threadId)
- `mobileActiveTab` (home/servers/notifications/profile)

Au retour dans l'app, ces valeurs sont lues et l'utilisateur retrouve exactement sa position.

## 5. Restauration au lancement

- **Desktop** (`Index.tsx`) : initialiser `activeChannelId` et `activeThreadId` depuis les valeurs persistees au lieu de les mettre a `null`
- **Mobile** (`MobileLayout.tsx`) : initialiser `mobileView` et `activeTab` depuis les valeurs persistees

---

## Resume des fichiers

| Fichier | Changement |
|---|---|
| `src/hooks/useHistoryNavigation.ts` | Nouveau hook pour pushState/popstate |
| `src/hooks/useNavigationState.ts` | Etendre le state persiste (channel, thread, mobileView, tab) |
| `src/components/mobile/MobileLayout.tsx` | Empiler l'historique a chaque navigation, ecouter popstate pour retour |
| `src/pages/Index.tsx` | Empiler l'historique sur desktop, restaurer l'etat complet au chargement |

