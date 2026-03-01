

# Modifications mobile demandees

## 1. Empecher les proprietaires de quitter leur serveur

**Fichier** : `src/components/mobile/MobileChannelListView.tsx`

Le bouton "Quitter" dans `ServerProfileSheet` est deja masque pour les proprietaires (`!isOwner`). Cependant, le hook `useLeaveServer` ne bloque pas cote client. On va verifier que `isOwner` couvre bien les deux cas (owner + secondary owner) -- c'est deja le cas (ligne 99). Aucun changement necessaire ici, la protection existe deja.

## 2. Deplacer l'icone d'engrenage dans la carte de profil serveur

**Fichier** : `src/components/mobile/MobileChannelListView.tsx`

- Retirer le bouton `Settings` (engrenage) du header de la liste des salons (lignes 371-375 et 383-387)
- Ajouter un bouton engrenage dans le `ServerProfileSheet`, en position `absolute top-2.5 left-2.5` sur la banniere (symetrique au bouton Quitter qui est a droite)
- Le `ServerProfileSheet` devra recevoir un nouveau prop `onOpenSettings` pour declencher l'ouverture des parametres du serveur
- Au clic, fermer le sheet puis appeler `onOpenSettings`

## 3. Renommer "Accueil" en "Messages"

**Fichier** : `src/components/mobile/MobileBottomNav.tsx`

- Changer `label: 'Accueil'` en `label: 'Messages'` (ligne 17)

## 4. Deplacer "Se deconnecter" dans les parametres globaux

**Fichier** : `src/components/mobile/MobileProfileView.tsx`

- Supprimer le bouton "Deconnexion" de la page profil (lignes 132-139)
- Le bouton est deja present dans `AccountSettingsModal` via `renderNavList` (ligne 99-102), donc rien a ajouter la-bas

## 5. Ouvrir les parametres sur la liste (pas sur un onglet specifique)

**Fichier** : `src/components/mobile/MobileProfileView.tsx`

- Modifier le bouton "Parametres du compte" pour ouvrir `AccountSettingsModal` avec `activeTab` a `null` (ce qui affiche la liste de navigation sur mobile, cf. lignes 139-149 de AccountSettingsModal)

**Fichier** : `src/components/account-settings/AccountSettingsModal.tsx`

- Ajouter un prop optionnel `initialTab` (par defaut `null` sur mobile, `'account'` sur desktop)
- Utiliser ce prop comme valeur initiale du state `activeTab`

**Fichier** : `src/components/mobile/MobileProfileView.tsx`

- Passer `initialTab={null}` au `AccountSettingsModal` pour que l'utilisateur arrive sur la liste

---

### Resume des fichiers modifies

| Fichier | Changement |
|---|---|
| `MobileBottomNav.tsx` | Renommer "Accueil" -> "Messages" |
| `MobileChannelListView.tsx` | Deplacer engrenage du header vers ServerProfileSheet ; passer `onOpenSettings` en prop |
| `MobileProfileView.tsx` | Supprimer bouton deconnexion ; passer `initialTab={null}` aux parametres |
| `AccountSettingsModal.tsx` | Ajouter prop `initialTab` optionnel |

