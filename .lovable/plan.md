

# Renommer le nom d'utilisateur (username) dans "Mon Compte"

## Objectif
Ajouter la possibilité de modifier son nom d'utilisateur directement depuis l'onglet "Mon Compte" des paramètres utilisateur.

## Comportement attendu
- Dans la carte "Informations du compte", le username affiché devient modifiable via un bouton "Modifier".
- En cliquant, un champ de saisie apparait avec le username actuel pré-rempli.
- Validation :
  - Le username doit etre en minuscules (conversion automatique).
  - Ne peut pas etre vide.
  - Verification de disponibilite via la fonction SQL `check_username_availability` deja existante en base.
- Boutons "Annuler" et "Enregistrer".
- En cas de succes, le profil local est mis a jour et un toast de confirmation s'affiche.

## Changements techniques

### Fichier : `src/components/account-settings/AccountSettings.tsx`

1. **Ajouter les etats** pour gerer le mode edition du username :
   - `isChangingUsername` (boolean)
   - `newUsername` (string, initialise avec `profile?.username`)

2. **Ajouter la fonction `handleChangeUsername`** :
   - Convertir en minuscules et trim.
   - Verifier que le champ n'est pas vide.
   - Appeler `supabase.rpc('check_username_availability', { p_username: newUsername })` pour verifier la disponibilite.
   - Si disponible, mettre a jour via `supabase.from('profiles').update({ username: newUsername }).eq('id', user.id)`.
   - Mettre a jour le profil local via `updateProfile` du AuthContext.
   - Toast succes/erreur.

3. **Modifier la section d'affichage du username** (actuellement lignes 133-136) :
   - Mode lecture : afficher le username avec un bouton "Modifier" a cote.
   - Mode edition : afficher un `Input` avec le nouveau username, un texte d'aide, et les boutons Annuler/Enregistrer.

### Aucun changement backend necessaire
- La fonction `check_username_availability` existe deja.
- La table `profiles` autorise deja les utilisateurs a modifier leur propre profil (RLS policy "Users can update their own profile").
- Le champ `username` existe deja dans la table.

