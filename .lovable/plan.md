

## Correction de la fonctionnalite Comptes memorises

### Probleme identifie
La fonction `handleQuickLogin` utilise `supabase.auth.refreshSession()` qui tente de rafraichir une session active. Or, quand l'utilisateur est sur `/auth` apres deconnexion, **il n'y a pas de session** - donc cette methode echoue systematiquement.

Sans stocker le mot de passe (ce qui serait dangereux), il est **impossible** de reconnecter automatiquement un utilisateur deconnecte.

---

## Solution proposee

La fonctionnalite doit etre repensee : au lieu d'une "connexion automatique", elle devient une **aide a la connexion** qui pre-remplit les champs.

### Modification de `handleQuickLogin` dans `src/pages/Auth.tsx`

```typescript
// AVANT (lignes 540-556) - Ne fonctionne pas
const handleQuickLogin = async (account: RememberedAccount) => {
  const { data, error } = await supabase.auth.refreshSession();
  
  if (error || !data.session) {
    setEmail(account.email);
    setLoginMethod('email');
    toast.info('Session expirée, veuillez ressaisir votre mot de passe');
    return;
  }
  
  updateAccountLastLogin(account.id);
  toast.success('Connexion réussie !');
  navigate('/');
};

// APRÈS - Simplifie en pre-remplissage
const handleQuickLogin = (account: RememberedAccount) => {
  // Pre-remplir l'email pour faciliter la connexion
  setEmail(account.email);
  setLoginMethod('email');
  // Focus sur le champ mot de passe serait ideal
  toast.info(`Entrez le mot de passe pour ${account.displayName}`);
};
```

---

## Changements techniques

| Fichier | Modification |
|---------|--------------|
| `src/pages/Auth.tsx` | Simplifier `handleQuickLogin` - retirer l'appel `refreshSession()` inutile, garder uniquement le pre-remplissage de l'email |

---

## Comportement attendu

1. L'utilisateur se connecte/inscrit normalement
2. Son compte est sauvegarde dans localStorage (cela fonctionne deja)
3. Lors des visites suivantes sur `/auth` :
   - La card s'affiche a droite avec les comptes memorises
   - Un clic sur un compte pre-remplit l'email
   - L'utilisateur n'a plus qu'a saisir son mot de passe

---

## Note importante

Cette approche est la seule securisee car :
- Le mot de passe n'est jamais stocke
- Les tokens de session expirent apres deconnexion
- L'utilisateur garde le controle total de ses identifiants

