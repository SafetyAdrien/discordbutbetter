
# Redirection apres suppression/depart de serveur + Style du header

## 1. Redirection vers le dernier serveur consulte

### Probleme actuel

- **Quitter un serveur (ChannelList)** : redirige vers `/channels/@me` (vue DM) au lieu du dernier serveur consulte.
- **Quitter un serveur (ServerList)** : appelle `onServerSelect(null)` qui va a la vue Home/DM.
- **Supprimer un serveur (ServerDeletePage)** : appelle `onClose()` qui ferme juste le modal de settings, laissant l'utilisateur sur un serveur qui n'existe plus (ecran vide).
- **Mobile (MobileChannelListView)** : ferme le sheet, aucune redirection.

### Solution

Centraliser la logique de redirection dans `Index.tsx` via un effet reactif : quand le serveur actif (`activeServerId`) n'existe plus dans la liste `servers`, basculer automatiquement vers le dernier serveur visite (en utilisant l'historique de `channelsByServer` dans `useNavigationState`), ou a defaut vers le premier serveur disponible, ou vers la vue Home si aucun serveur n'existe.

### Fichiers modifies

**`src/pages/Index.tsx`** :
- Ajouter un `useEffect` qui surveille `activeServerId` et `servers`. Si `activeServerId` est defini mais n'existe plus dans `servers` :
  1. Chercher le dernier serveur consulte via les cles de `channelsByServer` (qui contient l'historique serveur→channel).
  2. Si trouve et encore dans `servers`, basculer dessus.
  3. Sinon, prendre le premier serveur de la liste.
  4. Sinon, aller a Home (`setActiveServerId(null)`).

**`src/hooks/useNavigationState.ts`** :
- Exposer `channelsByServer` dans le retour du hook pour permettre a `Index.tsx` de lire l'historique des serveurs visites.

**`src/hooks/useLeaveServer.ts`** :
- Pas de changement. La logique de redirection est deja geree par l'effet reactif dans `Index.tsx` (le serveur disparait de la liste → l'effet se declenche).

**`src/components/server-settings/ServerDeletePage.tsx`** :
- Pas de changement necessaire. Apres suppression, `onClose()` ferme le modal, le serveur disparait de la query, l'effet dans `Index.tsx` redirige automatiquement.

**`src/components/layout/ChannelList.tsx`** :
- Supprimer le `navigate("/channels/@me")` dans `handleLeaveServer` car la redirection sera geree automatiquement par `Index.tsx`.

**`src/components/layout/ServerList.tsx`** :
- Supprimer la logique de redirection dans `confirmLeaveServer` (`onServerSelect(null)`) car l'effet reactif dans `Index.tsx` s'en chargera.

---

## 2. Header du serveur (teinte et separateur)

### Etat actuel

Le header du channel list (desktop) utilise `bg-[hsl(var(--card))] bg-[#121421]` — un fond code en dur qui ne suit pas la teinte de la liste des salons.

La liste des salons a une `bg-card` comme fond. Il n'y a pas de barre de recherche sur desktop (elle existe sur mobile uniquement).

### Modifications

**`src/components/layout/ChannelList.tsx`** :

1. **Header** : Remplacer `bg-[hsl(var(--card))] bg-[#121421]` par `bg-[hsl(var(--surface-elevated))]` — legèrement plus clair que `bg-card` de la liste de salons, en utilisant la variable semantique existante.

2. **Barre de recherche (desktop)** : Ajouter une barre de recherche sous le header avec un fond plus fonce (`bg-[hsl(var(--background))]`) pour creer le contraste inverse. Au clic, elle ouvrira le `GlobalSearchModal` existant (via `onOpenGlobalSearch` prop) ou declenchera `Ctrl+K`.

3. **Separateur** : Ajouter un `Separator` avec `bg-border/30` entre la zone header+recherche et la liste des salons, identique au pattern mobile (`MobileChannelListView`).

**`src/components/layout/ChannelList.tsx` (interface)** :
- Ajouter une prop `onOpenGlobalSearch?: () => void` a `ChannelListProps`.

**`src/pages/Index.tsx`** :
- Passer `onOpenGlobalSearch={() => setShowGlobalSearch(true)}` au composant `ChannelList`.

## Resume des fichiers modifies

| Fichier | Type de modification |
|---|---|
| `src/pages/Index.tsx` | Ajout de l'effet reactif de redirection + prop `onOpenGlobalSearch` |
| `src/hooks/useNavigationState.ts` | Exposer `channelsByServer` |
| `src/components/layout/ChannelList.tsx` | Header bg, barre de recherche, separateur, suppression du navigate |
| `src/components/layout/ServerList.tsx` | Suppression de la redirection dans confirmLeaveServer |
