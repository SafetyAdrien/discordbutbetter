

# Audit de securite complet et plan de renforcement

## Resultats de l'analyse

Le scan de securite a revele **11 problemes** (2 erreurs, 5 avertissements, 4 infos). Voici l'analyse complete et le plan de remediation.

---

## A. Problemes critiques (ERREUR)

### 1. Protection contre les mots de passe compromis desactivee cote serveur
- L'app fait deja une verification HIBP cote client, mais la protection native cote backend est desactivee
- Un attaquant peut contourner la verification client en appelant directement l'API d'inscription
- **Correction** : Activer la protection "leaked password" dans la configuration d'authentification via l'outil configure-auth

### 2. Donnees personnelles des profils trop exposees
- La politique RLS `Users can view related profiles` expose tous les champs du profil (bio, pronoms, activite, custom_status) a tout utilisateur qui partage un serveur, une amitie ou un DM
- **Correction** : Creer une vue `profiles_public` avec `security_invoker=on` qui n'expose que les champs necessaires (id, username, display_name, avatar_url, status, custom_status). Modifier la politique RLS de la table de base pour bloquer l'acces direct. Mettre a jour toutes les requetes client pour utiliser la vue

### 3. Tokens des webhooks exposes aux admins
- Les tokens sont visibles en clair pour les utilisateurs avec `manage_channels`
- **Correction** : Deja partiellement gere par la RPC `get_channel_webhooks` qui masque les tokens. Renforcer en hashant les tokens dans la table (stocker uniquement le hash), et ne reveler le token qu'une seule fois a la creation

---

## B. Avertissements (WARN)

### 4. Configuration du serveur visible par tous les membres
- `server_settings` lisible par tous les membres via RLS
- **Correction** : Restreindre la politique SELECT aux administrateurs et proprietaires uniquement

### 5. Logs d'audit manipulables
- Les administrateurs peuvent inserer de faux logs via la politique INSERT
- **Correction** : Supprimer la politique INSERT utilisateur. Utiliser uniquement des triggers SQL `SECURITY DEFINER` pour inserer les logs d'audit automatiquement

### 6. Voice states : contournement du mute serveur
- Un utilisateur peut potentiellement modifier ses champs `server_muted`/`server_deafened` via sa propre politique UPDATE
- **Correction** : Ajouter une contrainte dans la politique RLS UPDATE qui empeche la modification des champs `server_muted`, `server_deafened`, `muted_by` par l'utilisateur cible. Seules les fonctions RPC `server_mute_participant`/`server_deafen_participant` (SECURITY DEFINER) doivent pouvoir les modifier

### 7. Compteur d'utilisations des invitations manipulable
- Les administrateurs peuvent modifier le champ `uses` directement
- **Correction** : Supprimer la possibilite de modifier `uses` via la politique UPDATE admin. Le champ ne doit etre incremente que par la RPC `use_invite`

---

## C. Informations (INFO)

### 8. Metadata DM accessible apres retrait du groupe
- **Correction** : Ajouter un trigger qui supprime l'acces aux metadonnees quand un participant est retire

### 9. Indicateurs de frappe sans controle de confidentialite
- **Correction** : Ajouter une option utilisateur pour desactiver les indicateurs de frappe (champ `show_typing` dans profils)

### 10. Listes de participants dans les resumes de salon
- **Correction** : Anonymiser les noms des participants dans les resumes stockes

### 11. Raisons de bannissement visibles par tous
- **Correction** : Restreindre la visibilite de la colonne `reason` aux administrateurs via une vue securisee

---

## D. Problemes supplementaires detectes manuellement

### 12. Edge function `summarize-channel` : `verify_jwt = true` (obsolete)
- La methode `verify_jwt = true` dans config.toml est depreciee et ne fonctionne pas avec signing-keys
- **Correction** : Passer a `verify_jwt = false` et valider le JWT en code avec `getClaims()`

### 13. Aucun rate limiting cote client
- Pas de protection contre le spam de messages, les tentatives de login en boucle, ou l'abus des edge functions
- **Correction** : Ajouter un debounce/cooldown cote client sur l'envoi de messages (ex: 500ms minimum entre deux envois). Ajouter un compteur de tentatives de login echouees avec lockout temporaire (5 tentatives -> 30s d'attente)

### 14. Logs `console.log` excessifs en production
- 468 occurrences de `console.log` dans le code source, incluant des donnees WebRTC, des URLs, des payloads
- **Correction** : Supprimer ou conditionner tous les `console.log` derriere un flag `import.meta.env.DEV` pour eviter la fuite d'informations en production

### 15. Liens externes : protection `noopener,noreferrer` 
- Deja en place dans `ExternalLinkWarningModal` mais verifier la coherence sur tous les `window.open`

### 16. Absence de Content Security Policy (CSP)
- Aucun header CSP configure
- **Correction** : Ajouter des meta tags CSP dans `index.html` pour limiter les sources de scripts, styles et images autorisees

---

## E. Protection des donnees (zero collecte)

### 17. Minimisation des donnees stockees
- Verifier que seules les donnees strictement necessaires sont collectees
- Les champs optionnels du profil (bio, pronoms, activite) doivent etre vides par defaut et jamais pre-remplis
- Aucun tracking, aucun cookie tiers, aucun analytics externe

### 18. Suppression automatique des donnees obsoletes
- Ajouter un cleanup automatique : messages supprimes (purge physique apres 30j), indicateurs de frappe (deja en place), signaux voix (deja en place), sessions inactives

---

## Plan d'implementation par priorite

**Phase 1 — Critique (securite immediate)**
1. Activer leaked password protection (backend)
2. Corriger la politique RLS des voice_states (empecher self-unmute)
3. Passer `summarize-channel` a `verify_jwt = false` + validation en code
4. Restreindre `server_settings` aux admins
5. Proteger les audit_logs (INSERT par triggers uniquement)

**Phase 2 — Important (protection des donnees)**
6. Creer la vue `profiles_public` et bloquer l'acces direct a `profiles`
7. Restreindre la visibilite des raisons de ban
8. Proteger le champ `uses` des invitations
9. Ajouter CSP meta tags dans `index.html`

**Phase 3 — Renforcement (qualite)**
10. Nettoyer les `console.log` (conditionner derriere `DEV`)
11. Ajouter rate limiting client-side (login + messages)
12. Option de desactivation des indicateurs de frappe
13. Anonymiser les participants dans les resumes

Chaque phase necessitera des migrations SQL (RLS, vues, triggers) et des modifications de code front-end. Les phases 1 et 2 sont les plus critiques et devraient etre implementees en priorite.

