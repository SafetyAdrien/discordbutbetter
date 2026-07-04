## Système "Jour J d'anniversaire" 🎂

Une expérience festive qui se déclenche uniquement le jour même de la date de naissance de l'utilisateur, respectant un opt-in explicite.

---

### 1. Données & confidentialité

- Nouveau champ `birthday DATE` sur `profiles` (nullable, année stockée mais jamais exposée publiquement).
- Nouveau champ `birthday_public BOOLEAN DEFAULT false` — **opt-in explicite requis**. Rien ne se déclenche tant qu'il est `false`.
- Fonction SQL `SECURITY DEFINER` `is_birthday_today(uid uuid) → boolean` : compare `(EXTRACT(MONTH/DAY FROM birthday)) = (aujourd'hui)` **uniquement si `birthday_public = true`**. Utilisée par les hooks pour éviter d'exposer la date brute.
- Réglage dans `Settings → Confidentialité` : champ date + toggle "Célébrer publiquement mon anniversaire".

### 2. Effets publics (visibles par les autres)

**a. Couronne d'avatar animée + badge 🎂**
- Nouveau composant `<BirthdayAvatarCrown />` : anneau SVG dégradé doré animé (rotation lente 8s) + petit émoji 🎂 en overlay bas-droit sur l'avatar.
- Appliqué partout où l'avatar apparaît : `MemberList`, `ChatMessage`, `FullUserProfileModal`, `DMList`, mentions inline.
- Hook `useIsBirthday(userId)` qui interroge la RPC (cache 1h via React Query).

**b. Confettis à l'ouverture du profil**
- Dans `FullUserProfileModal`, si `isBirthday(user.id)` → déclenche `ConfettiCanvas` (déjà existant) au mount, une seule fois par session/profil.
- Bandeau ruban doré au-dessus du banner : "🎉 C'est l'anniversaire de {displayName} aujourd'hui !"

**c. Message système auto dans les serveurs communs**
- Job côté client (au premier login du jour) : pour chaque serveur commun avec un ami/membre dont c'est l'anniversaire, insérer **une seule fois** un `messages` avec `is_system=true` et contenu `🎂 C'est l'anniversaire de @{user} aujourd'hui — envoyez-lui un mot !`.
- Protection anti-doublon : table `birthday_wishes_sent (wisher_id, birthday_user_id, channel_id, sent_on DATE, UNIQUE)`.
- Rendu spécial dans `ChatMessage` (fond dégradé doré discret, bouton réaction 🎉 en un clic).

### 3. Effets privés (sur son propre écran)

**a. Toast + confettis au login**
- `AuthContext` détecte `is_birthday_today(currentUser)` au montage → `toast.success("🎂 Joyeux anniversaire, {displayName} !")` + `ConfettiCanvas` plein écran (2s).
- Flag `localStorage['birthday-celebrated-YYYY-MM-DD']` pour ne le faire qu'une fois par jour.

**b. Thème doré temporaire 24h**
- Nouveau hook dans `ThemeContext` : si jour J, applique une couche `--primary-birthday: 45 90% 55%` (or) qui override subtilement le primary courant (10% de mix) — compatible light/dark/custom theme.
- Bouton "Désactiver pour aujourd'hui" dans le toast.

**c. Badge permanent annuel**
- À chaque jour J, insérer un badge dans `user_badges` : `birthday_2026`, `birthday_2027`, etc. (le système `badges` existe déjà).
- Icône gâteau + tooltip "Anniversaire célébré en 2026".
- Insertion idempotente via `ON CONFLICT DO NOTHING` sur `(user_id, badge_id)`.

---

### Détails techniques

**Nouveaux fichiers**
- `src/hooks/useBirthday.ts` — `useIsBirthday(userId)`, `useMyBirthdayCelebration()`
- `src/components/profile/BirthdayAvatarCrown.tsx`
- `src/components/profile/BirthdayRibbon.tsx`
- `src/components/birthday/BirthdayLoginCelebration.tsx` (monté dans `App.tsx`)

**Migrations**
1. `ALTER TABLE profiles ADD COLUMN birthday DATE, ADD COLUMN birthday_public BOOLEAN DEFAULT false;`
2. `CREATE FUNCTION public.is_birthday_today(uid uuid) RETURNS boolean SECURITY DEFINER ...`
3. `CREATE TABLE public.birthday_wishes_sent (...)` + GRANT + RLS
4. Trigger/fonction `award_birthday_badge()` appelée depuis le hook, ou RPC dédiée `claim_birthday_badge()`.
5. Insertion des badges `birthday_YYYY` dans la table `badges`.

**Fichiers modifiés (surface minimale)**
- `src/components/ui/user-avatar-image.tsx` : accepte prop `showBirthdayCrown` (opt-in par composant parent).
- `MemberList`, `ChatMessage`, `FullUserProfileModal`, `DMList` : passent la prop selon `useIsBirthday`.
- `src/App.tsx` : monte `<BirthdayLoginCelebration />`.
- `src/contexts/ThemeContext.tsx` : injection variable `--primary-birthday` conditionnelle.
- Paramètres de confidentialité : ajout champ date + toggle.

**Performance**
- `useIsBirthday` batché : une seule RPC `are_birthdays_today(uids[])` pour toute la MemberList (évite N requêtes).
- Cache React Query : `staleTime: 1h`, `gcTime: 6h`.

**Confidentialité respectée**
- Année de naissance jamais renvoyée à d'autres utilisateurs (la RPC ne retourne qu'un booléen).
- Aucune célébration si `birthday_public = false`.
- Aucun log, aucune analytics — conforme à la politique zéro collecte.
