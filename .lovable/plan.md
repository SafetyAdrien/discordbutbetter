# Plan — Refonte Profil + Calendrier

## 1. NavBar mobile — Avatar au lieu de l'icône "Vous"
- `src/components/mobile/MobileBottomNav.tsx` : remplacer l'icône `User` du tab `profile` par l'`Avatar` (avatar_url) du profil courant. Conserver le badge, le pill actif, la pastille verte vocale. Fallback initiales si pas d'avatar. Récupération via `useAuth().profile`.

## 2. Édition du profil — Markdown live dans "À propos"
- Créer `src/components/profile/MarkdownLiveTextarea.tsx` réutilisant l'architecture overlay du chat (`InputMarkdownOverlay`) : textarea transparent + couche `parseMarkdown` synchronisée (scroll, font, padding). Sert sur mobile **et** desktop.
- `MobileEditProfileView.tsx` : remplacer la `<Textarea>` du bio par `<MarkdownLiveTextarea>`, support complet du Markdown rendu en temps réel pendant la frappe.

## 3. Vue/Édition Profil Desktop — alignement sur le design Mobile
- Réécrire `src/components/profile/ProfileSettings.tsx` (édition) en reprenant les patterns visuels de `MobileEditProfileView` :
  - Bannière + bouton caméra superposé, avatar `-mt-12` ring background, sections cards `rounded-2xl bg-card border border-border/50`.
  - Sections : Identité (display_name, username readonly, pronouns) → À propos (MarkdownLiveTextarea) → **Calendrier** (cf. §4) → Statut/Activité/Thème (existant, redesigné en cards).
  - Barre flottante "Modifications non enregistrées" au lieu du bouton fixe.
  - Modal occupe `max-w-3xl max-h-[92vh]` au lieu du layout actuel, padding adaptés desktop.
- `FullUserProfileModal.tsx` (vue lecture) : aligner les cards/spacing sur le mobile profile, sans toucher aux données affichées.

## 4. Nouvelle section "Calendrier" (Desktop + Mobile)

### 4.1 Base de données
Migration `calendar_events` :
- `id uuid pk`, `user_id uuid not null references auth.users on delete cascade`
- `title text not null` (max 120), `description text` (max 500)
- `event_date date not null`, `event_time time not null`
- `color text not null default '#00D4FF'` (hex)
- `is_public boolean not null default false`
- `created_at`, `updated_at` + trigger `update_updated_at_column`
- GRANT select/insert/update/delete authenticated + ALL service_role
- RLS :
  - SELECT : `user_id = auth.uid() OR is_public = true`
  - INSERT/UPDATE/DELETE : `user_id = auth.uid()`
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events`
- `REPLICA IDENTITY FULL` pour DELETE realtime

### 4.2 Hook `useCalendarEvents`
- `src/hooks/useCalendarEvents.ts` : query `['calendar-events', userId]`, mutations create/update/delete avec **mises à jour optimistes instantanées** (cf. mémoire `optimistic-updates-mutation-locking`), abonnement Realtime 1 channel par user.

### 4.3 Composants calendrier
- `src/components/profile/calendar/ProfileCalendar.tsx`
  - Grille hebdomadaire moderne : **heures (0h–23h) en colonne verticale gauche**, **jours en haut affichés en diagonale (texte `-rotate-45 origin-bottom-left`)** pour économiser l'espace.
  - Cellules cliquables (clic gauche) → ouvre `CreateEventModal` pré-rempli avec jour/heure.
  - Évènements rendus dans les cellules avec leur couleur de fond.
  - Navigation semaine précédente/suivante.
- `src/components/profile/calendar/EventListBelow.tsx` : liste sous le calendrier des évènements (titre, date, heure, pastille couleur, actions edit/delete).
- `src/components/profile/calendar/CreateEventModal.tsx`
  - Champs : titre, description (compteur 500), date (DatePicker shadcn), heure (`<input type="time">`), toggle public/privé.
  - Sélecteur couleur : 8 swatches préconfigurés + bouton "Personnalisé" qui révèle un `ModernColorPicker`.
- `src/components/profile/calendar/ModernColorPicker.tsx`
  - Input HexColor (texte) synchronisé.
  - Curseurs HSL : Teinte (0–360, gradient arc-en-ciel), Saturation (0–100), Luminosité (0–100).
  - Aperçu en direct, conversion hex↔hsl côté client.

### 4.4 Intégration
- Section "Calendrier" insérée juste après "À propos" dans `MobileEditProfileView` et dans la nouvelle `ProfileSettings`.
- Tout est instantané : optimistic update + realtime, **aucune latence perçue** (lock 500–800 ms conforme à la mémoire projet).

## Détails techniques

```text
Calendrier (vue hebdo)
┌──────┬────────┬────────┬────────┬────────┐
│      │  Lun   │  Mar   │  Mer   │ ...    │  ← jours en diagonale -rotate-45
├──────┼────────┼────────┼────────┼────────┤
│  8h  │   ▓▓   │        │        │        │
│  9h  │        │   ▓▓   │        │        │
│ ...  │        │        │        │        │
└──────┴────────┴────────┴────────┴────────┘
   ↑
   colonne heures
```

- Token couleur : on stocke un hex utilisateur (champ libre), c'est volontairement hors du design system (couleurs d'évènements personnelles).
- Markdown live : réutiliser `parseMarkdown` + overlay déjà éprouvé pour le chat (voir mémoire `markdown-system-and-input-overlay`).
- Avatar NavBar : utilise `useAuth()` déjà importé ailleurs dans `MobileLayout`, pas de prop drilling supplémentaire.

## Fichiers touchés
- Migration SQL : `calendar_events` (table + RLS + realtime).
- Nouveaux : `useCalendarEvents.ts`, `MarkdownLiveTextarea.tsx`, `ProfileCalendar.tsx`, `EventListBelow.tsx`, `CreateEventModal.tsx`, `ModernColorPicker.tsx`.
- Modifiés : `MobileBottomNav.tsx`, `MobileEditProfileView.tsx`, `ProfileSettings.tsx`, `FullUserProfileModal.tsx`.
