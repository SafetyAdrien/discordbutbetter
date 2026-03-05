

# Correctifs : Header Suivre, Permissions "Modifier le salon", et ChannelInput

## 1. Bouton "Suivre" dans le header des annonces — contour plus visible

**Fichier** : `src/components/channels/AnnouncementChannel.tsx` (ligne 399-406)

Le bouton "Suivre" utilise `variant="ghost"` sans style visuel de bordure. Ajouter une bordure subtile et un fond légèrement plus sombre pour le rendre cliquable sans modifier le hover.

```tsx
// Avant
className="text-sm font-medium flex-shrink-0"

// Après  
className="text-sm font-medium flex-shrink-0 border border-border/60 bg-muted/40"
```

## 2. Masquer "Edit Channel" sans permission `manage_channels`

Les deux fichiers affichent déjà le bouton conditionnellement avec `canManageChannels`, qui est correctement dérivé des permissions. Ce point fonctionne déjà — `canManageChannels` est `false` pour les membres sans permission.

**Vérification** : `ChatArea.tsx` ligne 1035 et `AnnouncementChannel.tsx` ligne 579 utilisent `{canManageChannels && (...)}`. Pas de changement nécessaire ici.

## 3. ChannelInput — Annonces : message + bouton Suivre pour les non-autorisés

**Fichier** : `src/components/channels/AnnouncementChannel.tsx` (lignes 244-247, 957)

**Problème actuel** : Le `permissionDeniedMessage` est un texte générique identique aux salons texte. Le `showFollowBar` utilise `!canSendMessages` mais pendant le chargement, `canSendMessages` est optimistiquement `true`, ce qui cause un flash.

**Corrections** :
- Changer le texte du `permissionDeniedMessage` pour les annonces : "Suivez ce salon pour recevoir ses mises à jour sur votre propre serveur" (déjà dans MessageInput mais le message passé est le texte générique)
- Appliquer la même logique de transition anti-flash que `ChatArea.tsx` (utiliser `isChannelTransitioning`)
- Le `showFollowBar` doit aussi utiliser le cache optimiste pour être instantané

```tsx
// AnnouncementChannel.tsx — Ajouter transition tracking comme ChatArea
const prevChannelIdRef = useRef(channel.id);
const isChannelTransitioning = prevChannelIdRef.current !== channel.id;

useEffect(() => {
  prevChannelIdRef.current = channel.id;
}, [channel.id]);

// permissionDeniedMessage — texte spécifique annonces
const permissionDeniedMessage = (isChannelTransitioning || permissionsLoading || isAdminOrOwner || canSendMessages)
  ? undefined
  : "Suivez ce salon pour recevoir ses mises à jour sur votre propre serveur";

// showFollowBar reste !canSendMessages (cohérent avec permissionDeniedMessage)
```

## 4. ChannelInput — Salons TEXT : message bloquant différent

**Fichier** : `src/components/chat/ChatArea.tsx` (ligne 513-515)

Le texte actuel est déjà correct : "Vous n'avez pas la permission d'envoyer des messages dans ce salon." et la logique anti-flash avec `isChannelTransitioning` est déjà en place. Pas de changement nécessaire.

## 5. MessageInput — le follow bar rend déjà le bon texte

**Fichier** : `src/components/chat/MessageInput.tsx` (lignes 431-448)

Le composant affiche déjà le texte hardcodé "Suivez ce salon..." quand `showFollowBar && permissionDeniedMessage`. Le texte du `permissionDeniedMessage` n'est pas affiché dans ce cas (le texte hardcodé dans MessageInput prend le dessus). Le fonctionnement est correct.

---

## Résumé des changements

| Fichier | Changement |
|---|---|
| `AnnouncementChannel.tsx` | Ajouter `border border-border/60 bg-muted/40` au bouton "Suivre" header |
| `AnnouncementChannel.tsx` | Ajouter tracking de transition canal (`prevChannelIdRef`) + ajuster la logique `permissionDeniedMessage` avec anti-flash identique à ChatArea |

**2 fichiers modifiés, ~10 lignes changées**

