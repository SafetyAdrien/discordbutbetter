

# Banniere mobile + Menu deroulant desktop + Positionnement salons

## 1. Banniere du serveur sur mobile (mode embedded)

**Fichier** : `src/components/mobile/MobileChannelListView.tsx`

Actuellement la banniere s'affiche uniquement en mode non-embedded. Il faut que la banniere s'affiche aussi en mode `embedded` (vue MobileServersView). Le header embedded (lignes 416-422) doit aussi supporter le mode banniere avec les memes regles : affichage quand `scrollTop === 0`, disparition au scroll.

**Changement** : Fusionner la logique de banniere pour qu'elle fonctionne quel que soit le mode `embedded`. Quand `showBanner && bannerUrl`, afficher la banniere avec le nom du serveur superpose (sans le bouton retour en mode embedded).

## 2. Remplacer l'engrenage par un menu deroulant (Desktop)

**Fichier** : `src/components/layout/ChannelList.tsx`

Remplacer le bouton `<Settings>` (lignes 1294-1299) par un bouton `<ChevronDown>` (petite fleche vers le bas). Au clic, afficher un `Popover` contenant :

- **Parametres du serveur** (icone `Settings`) -- ouvre `onOpenServerSettings`
- **Profil du serveur** (icone `Info`) -- ouvre les settings sur l'onglet `profile`
- **Separateur**
- **Emojis** (icone `Smile`) -- ouvre les settings sur l'onglet `emojis`
- **Stickers** (icone `Sticker`) -- ouvre les settings sur l'onglet `stickers`
- **SoundBoard** (icone `Volume2`) -- ouvre les settings sur l'onglet `soundboard`

Pour supporter l'ouverture directe sur un onglet specifique, le callback `onOpenServerSettings` doit accepter un parametre optionnel `initialTab`. Il faut propager ce parametre depuis `ChannelList` -> `Index.tsx` -> `ServerSettingsModal`.

**Fichiers impactes** :
- `src/components/layout/ChannelList.tsx` : modifier le header pour afficher le popover au lieu de l'engrenage
- `src/pages/Index.tsx` : modifier `onOpenServerSettings` pour accepter un `initialTab` optionnel et le passer a `ServerSettingsModal`
- `src/components/server-settings/ServerSettingsModal.tsx` : ajouter un prop `initialTab` optionnel qui definit le tab actif a l'ouverture

## 3. Positionnement de la liste des salons

**Fichiers** : `src/components/mobile/MobileChannelListView.tsx` et `src/components/layout/ChannelList.tsx`

La zone des salons et categories (`overflow-y-auto`) doit etre correctement collee au bord de la section. Actuellement il y a un `px-2` / `py-2` sur le conteneur scrollable. On ajuste pour que le contenu soit bien aligne au bord de la zone visible, en retirant le padding horizontal excessif et en s'assurant que les items occupent toute la largeur disponible.

**Changement concret** :
- Sur desktop (`ChannelList.tsx` ligne 1305) : verifier que le `px-2` est coherent et que les salons sont bien colles au bord lateral
- Sur mobile (`MobileChannelListView.tsx` ligne 426) : meme ajustement, supprimer ou reduire le padding pour que les salons s'etendent jusqu'au bord de la vue

---

### Resume des fichiers modifies

| Fichier | Changement |
|---|---|
| `MobileChannelListView.tsx` | Afficher la banniere aussi en mode embedded ; ajuster le padding des salons |
| `ChannelList.tsx` | Remplacer l'engrenage par un menu deroulant avec fleche ; ajuster le padding |
| `Index.tsx` | Propager `initialTab` vers `ServerSettingsModal` |
| `ServerSettingsModal.tsx` | Ajouter prop `initialTab` pour ouverture directe sur un onglet |

