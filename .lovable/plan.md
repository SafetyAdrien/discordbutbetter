

## Fonctionnalite : Comptes memorises pour connexion rapide

### Objectif
Ajouter une card sur la page de login affichant les comptes precedemment connectes, permettant une connexion en un clic sans ressaisir email/mot de passe.

---

## Architecture technique

### Stockage local (localStorage)
Les comptes seront stockes dans `localStorage` sous la cle `remembered_accounts` avec la structure suivante :

```typescript
interface RememberedAccount {
  id: string;           // user.id
  email: string;        // email du compte
  displayName: string;  // nom d'affichage
  username: string;     // nom d'utilisateur
  avatarUrl: string | null; // photo de profil
  lastLoginAt: number;  // timestamp derniere connexion
}
```

### Limitations de securite
- **Le mot de passe ne sera PAS stocke** (securite)
- La connexion rapide necessitem une session Supabase valide (refresh token)
- Si la session est expiree, l'utilisateur devra ressaisir son mot de passe

---

## Fichiers a modifier

### 1. Nouveau fichier : `src/hooks/useRememberedAccounts.ts`

Hook pour gerer les comptes memorises :

```typescript
// Fonctions principales
- getRememberedAccounts(): RememberedAccount[]
- addRememberedAccount(account: RememberedAccount): void
- removeRememberedAccount(id: string): void
- updateAccountLastLogin(id: string): void
```

---

### 2. Modifier : `src/pages/Auth.tsx`

#### A. Ajouter l'import du hook et des composants

```typescript
import { useRememberedAccounts, RememberedAccount } from '@/hooks/useRememberedAccounts';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { X, User } from 'lucide-react';
```

#### B. Modifier le layout principal (ligne ~663-665)

Transformer le conteneur centrer en layout flex horizontal pour avoir :
- Gauche/Centre : formulaire de login existant
- Droite : card des comptes memorises

```tsx
// AVANT
<div className="min-h-screen flex items-center justify-center bg-background p-4">
  <div className="w-full max-w-md">

// APRES
<div className="min-h-screen flex items-center justify-center bg-background p-4">
  <div className="flex items-start gap-6 max-w-4xl w-full">
    {/* Formulaire existant */}
    <div className="w-full max-w-md flex-shrink-0">
      ...
    </div>
    
    {/* Card comptes memorises (si des comptes existent) */}
    {rememberedAccounts.length > 0 && (
      <RememberedAccountsCard 
        accounts={rememberedAccounts}
        onSelectAccount={handleQuickLogin}
        onRemoveAccount={removeAccount}
      />
    )}
  </div>
</div>
```

#### C. Ajouter la logique de sauvegarde apres connexion reussie

Dans `handleLogin` (ligne ~261) et `handleSignup` (ligne ~403), apres le succes :

```typescript
// Apres connexion/inscription reussie, sauvegarder le compte
addRememberedAccount({
  id: user.id,
  email: email,
  displayName: profile.display_name,
  username: profile.username,
  avatarUrl: profile.avatar_url,
  lastLoginAt: Date.now(),
});
```

#### D. Ajouter la fonction de connexion rapide

```typescript
const handleQuickLogin = async (account: RememberedAccount) => {
  // Tenter de restaurer la session via refresh token
  const { data, error } = await supabase.auth.refreshSession();
  
  if (error || !data.session) {
    // Session expiree - pre-remplir l'email et demander le mot de passe
    setEmail(account.email);
    toast.info('Session expiree, veuillez ressaisir votre mot de passe');
    return;
  }
  
  // Session valide - connexion directe
  updateAccountLastLogin(account.id);
  toast.success('Connexion reussie !');
  navigate('/');
};
```

---

### 3. Nouveau composant : `src/components/auth/RememberedAccountsCard.tsx`

Card affichant la liste des comptes memorises :

```tsx
interface Props {
  accounts: RememberedAccount[];
  onSelectAccount: (account: RememberedAccount) => void;
  onRemoveAccount: (id: string) => void;
}

export function RememberedAccountsCard({ accounts, onSelectAccount, onRemoveAccount }: Props) {
  return (
    <div className="glass rounded-xl p-4 w-72">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Comptes enregistres
      </h3>
      
      <div className="space-y-2">
        {accounts.map((account) => (
          <div
            key={account.id}
            onClick={() => onSelectAccount(account)}
            className="group flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer relative"
          >
            {/* Avatar */}
            <Avatar className="h-10 w-10">
              <AvatarImage src={account.avatarUrl} />
              <AvatarFallback>
                {account.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {/* Infos */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {account.displayName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                @{account.username}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {account.email}
              </p>
            </div>
            
            {/* Bouton supprimer */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveAccount(account.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Flux utilisateur

1. **Premiere inscription/connexion** : L'utilisateur se connecte normalement, son compte est sauvegarde dans localStorage

2. **Connexions suivantes** : 
   - La card apparait a droite du formulaire
   - Clic sur un compte = tentative de connexion automatique
   - Si session valide = connexion directe
   - Si session expiree = pre-remplissage email + demande mot de passe

3. **Gestion des comptes** :
   - Bouton X pour supprimer un compte de la liste
   - Les comptes sont tries par derniere connexion

---

## Considerations de securite

- **Aucun mot de passe stocke** : Seules les infos publiques du profil sont sauvegardees
- **Refresh token gere par Supabase** : La reconnexion utilise le mecanisme securise de Supabase
- **Suppression facile** : L'utilisateur peut retirer un compte de la liste a tout moment

---

## Fichiers crees/modifies

| Fichier | Action |
|---------|--------|
| `src/hooks/useRememberedAccounts.ts` | Creer |
| `src/components/auth/RememberedAccountsCard.tsx` | Creer |
| `src/pages/Auth.tsx` | Modifier |

