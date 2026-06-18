## Contexte

Le redesign Desktop précédent a touché `ProfileSettings.tsx` — mais ce composant n'est PAS celui utilisé en Desktop. Sur Desktop :

- **Édition du profil** = `ProfileSettingsTab.tsx` (onglet dans `AccountSettingsModal`) → toujours en ancienne UI, sans calendrier, sans Markdown live complet.
- **Vue du profil (lecture)** = `FullUserProfileModal.tsx` → toujours en ancienne UI, sans calendrier.

Il faut donc porter la nouvelle UI Mobile vers ces deux composants Desktop.

## 1. Vue du Profil Desktop — `FullUserProfileModal.tsx`

Réécriture pour calquer la version Mobile lecture seule, adaptée aux dimensions Desktop :

- Modale `max-w-2xl max-h-[88vh]`, `rounded-2xl`, fond `bg-background`, ombre élégante.
- **Hero** : bannière (h-44) + dégradé thème en fallback, avatar `w-28 h-28 ring-[5px] ring-background` chevauchant (`-mt-14`), pastille de statut.
- Identité : nom d'affichage, `@username`, pronoms, statut perso.
- Cartes `rounded-2xl bg-card border border-border/50 p-4` :
  - **À propos** — rendu Markdown complet via `parseMarkdown(bio)`.
  - **Calendrier** — `<ProfileCalendar userId={user.id} readOnly />` + `<EventListBelow userId={user.id} readOnly />`, n'affiche que les events `is_public = true` du user visualisé.
  - **Serveurs en commun** / **Amis en commun** — listes existantes restylées en cartes.
  - **Note** (uniquement si pas son propre profil) — `Textarea` actuel conservé.
- Actions sticky bas : Message (DM) + Ajouter/Retirer ami (icônes lucide), arrondies pleines.

## 2. Édition du Profil Desktop — `ProfileSettingsTab.tsx`

Réécriture pour calquer `MobileEditProfileView` (et la version déjà faite dans `ProfileSettings.tsx`) :

- Layout en `space-y-4`, cartes `rounded-2xl bg-card border border-border/50 p-4`.
- Hero : bannière cliquable (camera overlay) + avatar `w-28 h-28` avec badge caméra rond.
- Sections cartes :
  - **Identité** : `display_name` (32), `pronouns` (50), `custom_status` (128).
  - **À propos** : `<MarkdownLiveTextarea>` (Markdown live complet, max 4000).
  - **Calendrier** : `<ProfileCalendar />` + `<EventListBelow />` (mode édition complet).
  - **Activité (Rich Presence)** : type + texte.
  - **Thème** : couleur unie / dégradé via `<ModernColorPicker>` (Hex + curseurs HSL + presets).
  - **Profils serveur** : bouton vers `ServerProfileEditModal`.
- Barre flottante sticky bas "Modifications non enregistrées" avec Annuler / Enregistrer.
- Suppression du double `Aperçu du profil` (redondant avec la vue lecture désormais cohérente).

## 3. Calendrier Desktop — vérifications

- `ProfileCalendar.tsx`, `EventListBelow.tsx`, `CreateEventModal.tsx` et `ModernColorPicker.tsx` ré-utilisés tels quels. Ajout d'une prop `userId?: string` et `readOnly?: boolean` à `ProfileCalendar` + `EventListBelow` pour la vue d'un autre user (filtre `is_public` côté hook).
- `useCalendarEvents.ts` étendu pour accepter un `userId` cible : si fourni et différent de l'utilisateur courant, charge uniquement les events publics.
- Grille hebdo + jours en diagonale + clic cellule → `CreateEventModal` (déjà OK en Mobile, juste vérifier le rendu Desktop responsive).

## 4. Fichiers touchés

- Réécrits : `src/components/profile/FullUserProfileModal.tsx`, `src/components/account-settings/ProfileSettingsTab.tsx`.
- Modifiés : `src/hooks/useCalendarEvents.ts`, `src/components/profile/calendar/ProfileCalendar.tsx`, `src/components/profile/calendar/EventListBelow.tsx` (props `userId` + `readOnly`).
- Non touchés : Mobile, migration DB (déjà en place), `ProfileSettings.tsx` (legacy gardé jusqu'à validation).

## Détails techniques

- Filtre events publics : dans le hook, si `userId !== auth.uid()` → `.eq('user_id', userId).eq('is_public', true)`.
- Realtime : 1 channel Supabase par `userId` cible (clé `calendar_events:${userId}`).
- Markdown bio (lecture) : `parseMarkdown` existant + classe `markdown-preview` (déjà utilisée).
- Markdown bio (édition) : `<MarkdownLiveTextarea>` (overlay transparent déjà créé).
- Aucune modif des autres pages, du Mobile, ou des `Core` memories.
