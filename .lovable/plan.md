

# Sécurité maximale des comptes

## 3 axes d'amélioration

### 1. Durcir le changement de mot de passe (`AccountSettings.tsx`)

Le formulaire actuel n'a que 6 caractères minimum, pas de HIBP, pas d'indicateur de force.

**Corrections :**
- Remplacer `<Input type="password">` par `<PasswordInput>` (composant existant)
- Ajouter `<PasswordStrengthIndicator>` avec vérification HIBP en temps réel (même logique debounced que dans `Auth.tsx`)
- Appliquer la même validation Zod que l'inscription : 8 chars min, majuscule, minuscule, chiffre
- Bloquer la soumission si le mot de passe est compromis (HIBP > 0)

**Fichier :** `src/components/account-settings/AccountSettings.tsx`

### 2. Authentification à deux facteurs (TOTP)

Utiliser l'API MFA native de Supabase (`supabase.auth.mfa`). Pas de table custom nécessaire.

**Flux d'activation :**
1. `supabase.auth.mfa.enroll({ factorType: 'totp' })` → retourne un QR code (URI + SVG)
2. L'utilisateur scanne avec Google Authenticator / Authy
3. L'utilisateur entre un code de vérification
4. `supabase.auth.mfa.challengeAndVerify({ factorId, code })` → confirme l'activation

**Flux de connexion (si 2FA activé) :**
1. Login email/password normal
2. Détection `session.user.factors` avec facteur vérifié
3. Affichage d'un écran de saisie du code TOTP
4. `supabase.auth.mfa.challengeAndVerify()` → accès accordé

**Flux de désactivation :**
1. Saisie du code TOTP actuel pour confirmer
2. `supabase.auth.mfa.unenroll({ factorId })`

**Fichiers :**
- `src/components/account-settings/TwoFactorSettings.tsx` (nouveau) — UI activation/désactivation QR + vérification
- `src/components/account-settings/AccountSettings.tsx` — remplacer le placeholder 2FA par `<TwoFactorSettings />`
- `src/components/auth/TwoFactorChallenge.tsx` (nouveau) — écran de saisie du code TOTP au login
- `src/pages/Auth.tsx` — après login réussi, vérifier si MFA est requis et afficher `<TwoFactorChallenge>`

### 3. Sessions actives réelles

Supabase ne fournit pas de liste de sessions multi-appareils via l'API client. On peut cependant :

- Afficher la session actuelle avec des détails réels (User-Agent parsé, date de connexion via `session.expires_at`)
- Implémenter "Se déconnecter partout" via `supabase.auth.signOut({ scope: 'global' })` (déconnecte toutes les sessions)
- Afficher le statut MFA actif/inactif dans la carte de session

**Fichier :** `src/components/account-settings/SessionsSettings.tsx` — remplacer le contenu mock par des données réelles

### Fichiers modifiés/créés

| Fichier | Action |
|---------|--------|
| `src/components/account-settings/AccountSettings.tsx` | Durcir mot de passe + intégrer 2FA |
| `src/components/account-settings/TwoFactorSettings.tsx` | Nouveau — activation/désactivation TOTP |
| `src/components/auth/TwoFactorChallenge.tsx` | Nouveau — saisie code TOTP au login |
| `src/pages/Auth.tsx` | Ajouter vérification MFA post-login |
| `src/components/account-settings/SessionsSettings.tsx` | Sessions réelles + logout global |

