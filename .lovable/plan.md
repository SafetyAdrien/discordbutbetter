## Objectif

Étendre le panneau profil flottant (bas-gauche desktop) pour qu'il s'étire **par la gauche** et couvre à la fois la zone sous la liste des serveurs (80 px) **et** sa position actuelle dans la colonne des canaux — un seul grand conteneur flottant qui chevauche les deux colonnes, ancré au bas de la fenêtre.

## Approche

Le panneau ne peut plus vivre à l'intérieur de `ChannelList` / `DMPage` car il doit déborder à gauche au-dessus de `ServerList`. Solution : le sortir du flux des colonnes et le rendre comme un **overlay fixe en bas à gauche** via `position: fixed`, monté une seule fois au niveau de `src/pages/Index.tsx`.

## Modifications

### 1. `src/pages/Index.tsx`
- Importer `UserProfileCard`
- Ajouter un état local `showAccountSettings` (déjà géré via les enfants — on l'élève au niveau Index, ou on garde un état dédié ici)
- Juste avant la fermeture du conteneur racine (`<div className="h-[100svh] flex ...">`), ajouter (uniquement quand `!isMobile && !isTablet`) :

```tsx
<div
  className="fixed bottom-0 left-0 z-40 h-16"
  style={{ width: 'calc(80px + 2px + 240px)' }}  // ServerList(80) + gap(2px) + ChannelList(240)
>
  <UserProfileCard
    onOpenSettings={() => setShowAccountSettings(true)}
    onOpenProfile={() => setShowAccountSettings(true)}
    speakingUsers={speakingUsers}
  />
</div>
```

- Modal `AccountSettingsModal` également rendu ici.

### 2. `src/components/layout/ChannelList.tsx`
- Supprimer le rendu de `<UserProfileCard ... />` (lignes 1915-1918) et son `AccountSettingsModal` associé piloté par `showAccountSettings` lié au profil.
- Conserver le bloc `VoiceControls` au-dessus.
- Ajouter un **spacer** en bas du conteneur des canaux : `<div className="h-16 shrink-0" />` pour que le contenu défilable ne passe pas sous le panneau fixe.

### 3. `src/components/dm/DMPage.tsx`
- Même chose : supprimer `<UserProfileCard ... />` (lignes 144-148) + `AccountSettingsModal` lié.
- Ajouter le spacer `<div className="h-16 shrink-0" />` en bas de la colonne DM list.

### 4. `src/components/profile/UserProfileCard.tsx`
Adapter le conteneur racine pour le nouveau format élargi :

Actuel (ligne 124-126) :
```
h-14 px-2 py-1.5 mx-2 mb-2 rounded-2xl flex items-center gap-2 bg-[hsl(var(--surface-2))] border border-border/40
```

Nouveau :
```
h-full mx-2 mb-2 px-3 py-2 rounded-2xl flex items-center gap-3 bg-[hsl(var(--surface-2))] border border-border/40
```

- Avatar : `w-9 h-9`
- Pseudo : `text-[15px] font-semibold`
- Boutons mic / casque / paramètres : icônes `w-[18px] h-[18px]`, padding `p-2`
- Le tooltip du nom (truncate) reste géré par `flex-1 min-w-0`

## Aperçu visuel

```
┌──────────────────────────────────────────────────┐
│ [S1]  │ # general                                │
│ [S2]  │ # random                                 │
│ [S3]  │                                          │
│       │ ┌──── VoiceControls (si actif) ────┐     │
│       │ └─────────────────────────────────-┘     │
├───────┴──────────────────┐                       │
│ ┌──────────────────────┐ │                       │  ← Panneau profil
│ │A  Adrien_Sama 🎤🎧⚙ │ │   reste de l'app      │     fixe, déborde
│ │   Online             │ │                       │     sur ServerList
└─┴──────────────────────┴─┴───────────────────────┘
```

## Détails techniques

- Largeur exacte du panneau : `ServerList(80) + gap(2px) + ChannelList(240) = 322px`. Le `flex` racine de `Index.tsx` utilise `gap-[2px]`, et `ChannelList` est `w-60` (240 px).
- `z-40` pour passer au-dessus des deux colonnes sans masquer les modals (`z-50+`).
- Le panneau n'est rendu **que sur desktop** (`!isTablet && !isMobile`). En tablette, la `ChannelList` est dans un drawer — comportement existant inchangé.

## Hors scope

- Mobile / tablette
- Logique (popover statut, mute, deafen, settings) : inchangée
- Tokens CSS globaux : inchangés
