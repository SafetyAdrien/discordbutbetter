# Correctifs généraux

## 1. Propriétaire / Second propriétaire — synchro temps réel + UX

**Objectif** : ajout/retrait du second propriétaire instantané sur tous les clients, confirmation préalable, et action accessible depuis le clic droit sur un membre.

- Activer la propagation realtime sur la table `servers` (champ `secondary_owner_id`) si elle ne l'est pas déjà — et brancher l'invalidation/patch cache dans `useServers` afin que le badge "Second propriétaire" apparaisse/disparaisse instantanément dans la liste des membres, profils, popovers et MemberManager sans rechargement.
- Forcer l'invalidation/patch également de `useSecondaryOwner` au moment du UPDATE realtime.
- Ajouter l'entrée **"Ajouter second propriétaire"** / **"Retirer second propriétaire"** dans le menu contextuel (clic droit) sur un membre dans `MemberList` (desktop) et l'équivalent mobile. Visible uniquement pour le **propriétaire officiel** du serveur, et masquée sur le propriétaire lui-même.
- Avant toute action (ajout, retrait, transfert), afficher un **AlertDialog de confirmation** ("Êtes-vous sûr de vouloir nommer X second propriétaire ?" / "Êtes-vous sûr de vouloir retirer X de la position de second propriétaire ?"). Réutiliser le pattern déjà présent dans `MemberManager`.

## 2. Statut personnalisé masqué quand Offline

Dans tous les composants qui rendent le custom status (`CustomStatusBubble`, `UserProfilePopup`, `UserProfileCard`, `FullUserProfileModal`, `MemberList`, listes DM, etc.) :

- Ne jamais afficher `custom_status.text` / `emoji` quand `profile.status === 'offline'`.
- Centraliser via un petit helper (`getVisibleCustomStatus(profile)`) pour ne pas oublier d'endroit.

## 3. Paramètres du serveur — Full Screen

`src/components/server-settings/ServerSettingsModal.tsx` (desktop branch ligne 237-242) :

- Remplacer le pattern overlay + carte `max-w-5xl max-h-[90vh]` par un conteneur plein écran `fixed inset-0 bg-background` (le même que la branche mobile/tablette actuelle ligne 200).
- Supprimer le backdrop assombri et le centrage : la modale prend désormais 100% de la fenêtre, comme Discord.
- Conserver la sidebar de navigation interne + bouton de fermeture en haut à droite.

## 4. Color Picker moderne et universel

**Objectif** : remplacer toute UI de sélection couleur par un picker au format de l'image fournie.

### Composant `ModernColorPicker` (réécriture de `src/components/profile/calendar/ModernColorPicker.tsx`)

Structure verticale, dans un cadre arrondi :

```text
+---------------------------------------+
|                                       |
|     Zone saturation/valeur 2D         |  <- crosshair circulaire blanc, draggable
|     (dégradé teinte courante)         |
|                                       |
+---------------------------------------+
|  ====== Slider teinte (hue) ======    |  <- crosshair circulaire blanc identique
+---------------------------------------+
|  ●  # F54927    [copy]  [Hex ▼]       |
+---------------------------------------+
```

- **Zone SV** : `<canvas>` ou div en `bg-gradient` (blanc→teinte horizontal, transparent→noir vertical). Pointer events : `pointerdown` + `pointermove` + `setPointerCapture`. Le réticule est un rond blanc bordé, centré exactement sur la position du curseur (translate -50% -50%). Pendant le drag : `cursor: none` sur la zone (et sur le `body` via classe) pour cacher la souris ; restauré au `pointerup`.
- **Slider teinte** : même mécanique pointer, réticule rond identique.
- **Mise à jour temps réel** : `onChange` appelé à chaque pointermove (throttle via rAF), parent reçoit le HEX instantanément — pas de "commit on release".
- **Bandeau bas** : pastille de la couleur courante, champ HEX éditable, bouton **copy** (icône `Copy` lucide → `navigator.clipboard.writeText`, toast "Copié"), et menu déroulant de format (`Hex`, `RGB`, `HSL`) qui change l'affichage de la valeur.
- **Bouton copy conditionnel** : visible uniquement quand le format est choisi via le menu déroulant (comportement de la vidéo) — on l'attache au champ de valeur, pas à la palette globale.

### Points d'utilisation à migrer

Remplacer le `<input type="color">` ou ancien UI par `ModernColorPicker` (rendu dans un `Popover` déclenché par l'icône palette/pastille existante) dans :

- `src/components/server-settings/RoleEditor.tsx` (couleur de rôle, lignes 178-186).
- `src/components/profile/calendar/CreateEventModal.tsx` (déjà branché, hérite automatiquement du nouveau composant).
- `src/components/account-settings/ProfileSettingsTab.tsx` (couleur de bannière / accent).
- Toute autre icône `Palette` qui ouvre un sélecteur de couleur dans les paramètres profil/serveur.

Le composant est unique → comportement identique partout (drag, crosshair, masquage souris, copy, temps réel).

---

## Détails techniques

**Realtime second propriétaire** : `ALTER PUBLICATION supabase_realtime ADD TABLE public.servers;` si absent, plus `REPLICA IDENTITY FULL` sur `servers` pour récupérer l'ancien `secondary_owner_id` en UPDATE. Côté client, dans `useServers`, écouter `postgres_changes UPDATE` et patcher la cache React Query.

**Color picker — masquage souris** : ajouter une classe utilitaire `.cursor-none-global` (`* { cursor: none !important; }`) toggleée sur `document.documentElement` durant le drag pour garantir l'absence de curseur même hors zone.

**Custom status hidden offline** : helper unique dans `src/lib/utils.ts` ou `src/lib/presence.ts` :

```ts
export const visibleCustomStatus = (p?: { status?: string; custom_status?: any }) =>
  p && p.status !== 'offline' ? p.custom_status : null;
```

Aucune modification de la base sauf l'ajout éventuel de `servers` à la publication realtime.

## Fichiers touchés

- `src/components/profile/calendar/ModernColorPicker.tsx` (réécriture complète)
- `src/components/server-settings/RoleEditor.tsx`
- `src/components/account-settings/ProfileSettingsTab.tsx`
- `src/components/server-settings/ServerSettingsModal.tsx`
- `src/components/server-settings/MemberManager.tsx`
- `src/components/layout/MemberList.tsx` + équivalent mobile
- `src/hooks/useServers.ts` (realtime patch)
- `src/hooks/useSecondaryOwner.ts` (invalidation realtime)
- `src/components/profile/CustomStatusBubble.tsx`, `UserProfilePopup.tsx`, `UserProfileCard.tsx`, `FullUserProfileModal.tsx` (guard offline)
- `src/lib/utils.ts` (helper `visibleCustomStatus`)
- Migration SQL : `ALTER PUBLICATION supabase_realtime ADD TABLE public.servers;` + `REPLICA IDENTITY FULL` si nécessaire
