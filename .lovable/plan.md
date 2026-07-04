## 1. Badge d'anniversaire annuel stable

### Problème actuel
Chaque année crée un nouveau badge `birthday_YYYY` (2026, 2027…) — la liste des badges explose et il n'y a jamais de « badge anniversaire » unique et pérenne.

### Nouvelle architecture
- **Un seul badge permanent** de clé `birthday` (nom : « Anniversaire », icône 🎂 dorée). Il ne se re-crée jamais.
- **Nouvelle table `user_badge_grants`** pour conserver l'historique année par année :
  - `user_id`, `badge_id`, `granted_for` (int — l'année, ex. `2026`), `granted_at`.
  - `UNIQUE(user_id, badge_id, granted_for)` → une célébration par an au maximum.
- La table `user_badges` reste inchangée (une seule ligne par badge attribué) et sert d'index d'affichage. `granted_at` reste la 1ʳᵉ attribution.
- Tooltip du badge sur le profil : « Anniversaire — célébré en 2024, 2025, 2026 » (années lues depuis `user_badge_grants`).

### Migration idempotente
1. Créer le badge `birthday` s'il n'existe pas.
2. Créer `user_badge_grants` (+ GRANTs + RLS : lecture publique authentifiée, écriture via RPC uniquement).
3. Migrer les anciens `birthday_YYYY` :
   - Pour chaque `user_badges` pointant vers un badge `birthday_YYYY`, insérer dans `user_badge_grants(user_id, birthday_badge_id, YYYY, granted_at)`.
   - Insérer une ligne `user_badges(user_id, birthday_badge_id)` (ON CONFLICT DO NOTHING).
   - Supprimer les anciennes lignes `user_badges` pointant vers `birthday_YYYY`.
   - Supprimer les badges `birthday_YYYY` de la table `badges`.
4. Réécrire `claim_my_birthday_badge()` : garantit `user_badges(birthday)` + insère `user_badge_grants(..., année_courante)` (`ON CONFLICT DO NOTHING`), retourne l'`badge_id`.

### Hook côté client
- Nouveau `useBirthdayGrantYears(userId)` : renvoie `number[]` des années.
- `UserBadgeList` (tooltip) : si `badge.key === 'birthday'`, ajouter « Célébré en 2024, 2025, 2026 » sous la description.

---

## 2. Badges inline dans l'en-tête d'identité du profil

### Emplacement
Dans `FullUserProfileModal` → section « Identity » (celle avec `display_name` + `@username`) :
- Restructurer la section en **flex `justify-between`** :
  - **Gauche** (existant) : `display_name`, `@username`, pronouns, « Membre depuis… ».
  - **Droite (nouveau)** : petite pile verticale contenant :
    - Les badges (taille `sm`, max 5 visibles + « +N » condensé si plus) — juste au-dessus…
    - Un **bouton copier** discret (icône `Copy` de lucide, `ghost` `size="icon"`, `h-7 w-7`) qui copie le `@username` dans le presse-papier avec toast « Nom d'utilisateur copié ».

### Nouveau composant
`InlineBadgeStrip` (dans `src/components/badges/InlineBadgeStrip.tsx`) :
- Reçoit `userId`, `max = 5`.
- Utilise `useBadges` + `useUserBadges` (déjà cache-first via IndexedDB, aucun coût réseau supplémentaire).
- Affiche jusqu'à `max` icônes avec `Tooltip` (réutilise le rendu du `UserBadgeList` en version compacte).
- Au-delà, badge « +N » ouvrant… on garde simple, un `Tooltip` listant les noms restants.

### Section « Badges » complète (existante)
On la **conserve** telle quelle plus bas dans le scrollable body — la strip inline sert de teaser rapide, la section complète reste pour le détail (labels + descriptions).

### Cas vide
Si l'utilisateur n'a aucun badge, la colonne de droite affiche uniquement le bouton copier (pas de vide bizarre).

---

## Fichiers touchés

**Migration**
- 1 migration `supabase--migration` : création badge `birthday` stable, création `user_badge_grants`, migration des anciens `birthday_YYYY`, réécriture de `claim_my_birthday_badge()`.

**Nouveaux fichiers**
- `src/components/badges/InlineBadgeStrip.tsx`
- `src/hooks/useBirthdayGrants.ts` — `useBirthdayGrantYears(userId)`.

**Modifiés**
- `src/components/badges/UserBadgeList.tsx` — enrichit le tooltip pour le badge `birthday` avec la liste d'années.
- `src/components/profile/FullUserProfileModal.tsx` — restructure la section Identity avec la colonne de droite (strip + bouton copier).
- `src/components/birthday/BirthdayLoginCelebration.tsx` — inchangé (le RPC gère déjà tout).

Aucun impact sur les autres écrans, aucun changement UX ailleurs.
