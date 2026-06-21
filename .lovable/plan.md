# Système de Badges (Discord-like)

Badges retenus : **Bug Hunter**, **Moderator Alumni**, **Staff**, **Early Supporter**, **Active Developer**.
Attribution : 100 % manuelle via une page admin (réservée Main Owner / Secondary Owner).
Icônes : SVG custom uploadées en DB (bucket Storage).

---

## 1. Backend (Lovable Cloud)

### Bucket Storage
- `badge-icons` (public, SELECT anon) pour héberger les SVG/PNG.

### Tables

**`badges`** — catalogue des badges disponibles
- `id uuid pk`
- `key text unique` (ex: `bug_hunter`, `mod_alumni`, `staff`, `early_supporter`, `active_dev`)
- `name text`
- `description text`
- `icon_url text` (vers `badge-icons`)
- `color text` (couleur d'accent du tooltip)
- `sort_order int` (ordre d'affichage)
- `created_at timestamptz default now()`

**`user_badges`** — attribution
- `id uuid pk`
- `user_id uuid → auth.users on delete cascade`
- `badge_id uuid → badges on delete cascade`
- `granted_at timestamptz default now()`
- `granted_by uuid` (admin qui l'a donné)
- `unique(user_id, badge_id)`

### GRANT + RLS
- `badges` : `SELECT` ouvert à `anon` + `authenticated` (lecture publique). Écriture : Main/Secondary Owner uniquement via RPC `SECURITY DEFINER`.
- `user_badges` : `SELECT` à `authenticated` (tout le monde voit les badges des autres). Écriture via RPC `grant_badge` / `revoke_badge` qui vérifient `is_main_owner_or_secondary(auth.uid())`.

### Seed initial
Insertion des 5 badges (clé, nom, description, couleur). `icon_url` rempli après upload dans la page admin.

---

## 2. Page Admin (`/admin/badges`)

Accessible uniquement aux Main/Secondary Owner globaux (réutilise la logique existante `useSecondaryOwner` / owner global de l'app). Si pas owner → redirect.

**Onglet 1 — Catalogue Badges**
- Liste des 5 badges avec aperçu icône, nom, description.
- Upload/replace icône SVG (drag-drop → `badge-icons` bucket).
- Édition nom / description / couleur / ordre.

**Onglet 2 — Attribution**
- Recherche utilisateur (réutilise `useGlobalSearch` pattern profils).
- Pour l'utilisateur sélectionné : checkboxes ON/OFF de chaque badge.
- Toggle = appel RPC `grant_badge` / `revoke_badge` + invalidation cache.

---

## 3. Affichage des badges

### a) `UserProfilePopup` (mini-profil)
Sous le nom d'utilisateur, ligne de petites icônes (16-20px) avec `Tooltip` au survol affichant `name + description`.

### b) `FullUserProfileModal` (profil complet)
Nouvelle section "Badges" avant "À propos de moi" :
- Grille d'icônes plus grandes (28-32px)
- Clic → popover détaillé (nom, description, date d'obtention).

### c) Emplacement supplémentaire
Laissé en attente — l'utilisateur précisera après validation. Le composant `<UserBadgeList userId size="sm|md|lg" />` sera réutilisable n'importe où.

---

## 4. Hooks & composants

- `useBadges()` → catalogue (cache long, realtime sur `badges`).
- `useUserBadges(userId)` → badges d'un user (realtime sur `user_badges` filtré).
- `useGrantBadge()` / `useRevokeBadge()` → mutations RPC, invalidation optimiste.
- `<UserBadgeList userId size />` → composant générique réutilisable.
- `<BadgeTooltip badge />` → tooltip standardisé.

---

## 5. Realtime & cache
- Channel Supabase dédié `badges` + `user_badges` (1 channel par table — respect de l'architecture existante).
- Invalidation des popups/modals à la réception d'événements.
- Cache IndexedDB via `warmCache` existant.

---

## Fichiers créés / modifiés (estimation)

**Nouveaux**
- Migration SQL (tables, RLS, GRANT, RPC, seed, bucket)
- `src/hooks/useBadges.ts`
- `src/hooks/useUserBadges.ts`
- `src/components/badges/UserBadgeList.tsx`
- `src/components/badges/BadgeTooltip.tsx`
- `src/components/admin/BadgesAdminPage.tsx`
- `src/components/admin/BadgeCatalogEditor.tsx`
- `src/components/admin/BadgeAssignmentPanel.tsx`
- Route admin dans `App.tsx`

**Modifiés**
- `src/components/profile/UserProfilePopup.tsx` → insertion `<UserBadgeList size="sm" />`
- `src/components/profile/FullUserProfileModal.tsx` → section "Badges"
- `src/lib/cache.ts` → warmCache badges
- `mem://index.md` → nouvelle référence mémoire

---

## Points à confirmer avant build

1. **Qui peut gérer les badges ?** Je propose : Main Owner + Secondary Owner globaux uniquement. OK ?
2. **Icônes initiales** : tu fournis les SVG ou je génère des placeholders propres (style Streamline / Discord) que tu remplaceras ensuite via la page admin ?
3. **Le 3e emplacement d'affichage** (chat ? member list ? autre ?) : tu confirmes qu'on l'ajoute plus tard une fois le système en place ?
