## Objectif

Affiner le panneau profil flottant (bas-gauche desktop) :
1. **Réduire** la taille des boutons (mic, casque, paramètres) actuellement à `p-2` + icônes `18×18`.
2. **Séparer** chaque bouton micro/casque de son chevron ⌄ propre, qui ouvre un popover de paramètres **dédié au périphérique** correspondant.
3. **Afficher** un bloc « Connecté · Salon / Serveur » au-dessus du panneau profil, séparé par un léger gap, quand l'utilisateur est dans un canal vocal — comme sur la capture Discord fournie.

## 1. Réduction de taille des boutons (`src/components/profile/UserProfileCard.tsx`)

- Hauteur du panneau ramenée légèrement : conserver `h-full` (l'overlay parent reste `h-[68px]`, panneau interne reste `mb-2` → ~60 px utiles)
- Boutons : `p-1.5` (au lieu de `p-2`)
- Icônes : `w-4 h-4` (au lieu de `w-[18px] h-[18px]`)
- Gap entre boutons : `gap-0.5` au lieu de `gap-3` global → on regroupe les boutons à droite dans un `<div className="flex items-center gap-0.5">`

## 2. Micro / Casque + chevron séparés

### Micro
Structure (remplace le bouton micro actuel dans `UserProfileCard.tsx`) :

```tsx
<div className="flex items-center">
  <button onClick={toggleMute} className="p-1.5 hover:bg-muted rounded-l-md rounded-r-none ...">
    <DiscordMic className="w-4 h-4 ..." />
  </button>
  <MicrophoneSettingsPopover {...micProps}>
    <button className="px-0.5 py-1.5 hover:bg-muted rounded-l-none rounded-r-md ...">
      <ChevronDown className="w-3 h-3 text-muted-foreground" />
    </button>
  </MicrophoneSettingsPopover>
</div>
```

`MicrophoneSettingsPopover` existe déjà (`src/components/channels/voice/MicrophoneSettingsPopover.tsx`) — il sera réutilisé tel quel avec les props issues de `useVoice()` (`micVolume`, `vadSensitivity`, `noiseSuppression`, filtres audio, etc.) déjà disponibles via le contexte.

### Casque
Création d'un nouveau composant **`src/components/channels/voice/HeadphonesSettingsPopover.tsx`** dédié au périphérique de sortie. Comme le contexte audio actuel ne gère ni `outputVolume` global ni `setSinkId`, on ajoute le minimum nécessaire :

#### Ajouts dans `src/contexts/VoiceContext.tsx`
- Nouvel état `outputVolume: number` (0–200, défaut 100), persisté dans `localStorage`.
- Setter `setOutputVolume(v)` qui :
  - met à jour l'état,
  - parcourt toutes les `<audio>` distantes via une `Map<userId, HTMLAudioElement>` existante (ou via un `outputVolumeRef` lu par chaque `<audio>` lors de l'ajout) pour appliquer `el.volume = v/100` (cappé à 1).
- Exposé dans la valeur du contexte.

Si la `Map<userId, HTMLAudioElement>` n'existe pas exactement, je l'instrumenterai en remontant aux endroits où les audio remotes sont créés (à confirmer pendant l'implémentation, dans la même file VoiceContext).

#### Contenu du popover casque
- Titre « Paramètres du son »
- Slider **Volume général** (0–200%, défaut 100)
- Bouton bascule **Couper le son** (utilise `toggleDeafen`, indicateur d'état actuel)
- Section info : nombre de participants entendus + lien « Gérer les volumes individuels » (désactivé pour cette itération — note « Clique-droit sur un utilisateur en vocal »)

Structure intégrée dans le panneau profil comme pour le micro :

```tsx
<div className="flex items-center">
  <button onClick={toggleDeafen} className="p-1.5 rounded-l-md rounded-r-none ...">
    {isDeafened ? <DiscordHeadphonesOff/> : <DiscordHeadphones/>}
  </button>
  <HeadphonesSettingsPopover outputVolume={outputVolume} onOutputVolumeChange={setOutputVolume} isDeafened={isDeafened} onToggleDeafen={toggleDeafen}>
    <button className="px-0.5 py-1.5 rounded-l-none rounded-r-md ...">
      <ChevronDown className="w-3 h-3 ..." />
    </button>
  </HeadphonesSettingsPopover>
</div>
```

### Paramètres (engrenage)
Inchangé : bouton seul, sans chevron, ouvre `AccountSettingsModal`.

## 3. Bloc "Connecté · Vocal" au-dessus du profil

Sur la capture de référence, un encart distinct affiche :
- Indicateur de force du signal (vert)
- « Connecté » en vert + « <Salon> / <Serveur> » dessous
- (rangée actuelle de boutons mic/chevron/casque/PTT/déconnexion conservée juste en-dessous)

Ce bloc existe déjà dans `VoiceControls.tsx` mais est rendu **à l'intérieur** de `ChannelList`/`DMPage`. Avec le panneau profil maintenant flottant en overlay, on a deux options :

**Option retenue** : remonter `VoiceControls` à côté du panneau profil, dans l'overlay fixe créé à `src/pages/Index.tsx`, juste **au-dessus** du `UserProfileCard`, avec un léger gap.

### Modifications

#### `src/pages/Index.tsx`
- Englober `VoiceControls` (déjà importable depuis `@/components/layout/VoiceControls`) + `UserProfileCard` dans un wrapper vertical fixe :

```tsx
{!isMobile && !isTablet && (
  <div
    className="fixed bottom-0 left-0 z-40 flex flex-col gap-1"
    style={{ width: 'calc(80px + 2px + 240px)' }}
  >
    {isConnected && voiceState.channelName && (
      <VoiceControls .../>
    )}
    <div className="h-[68px]">
      <UserProfileCard ... />
    </div>
  </div>
)}
```

`isConnected`, `voiceState`, `toggleMute`, `toggleDeafen`, `leaveChannel` viennent de `useVoice()` (`toggleMute` déjà déstructuré, ajouter le reste).

#### `src/components/layout/ChannelList.tsx`
- Supprimer le rendu `<VoiceControls ... />` (lignes ~1901-1912) : il est maintenant dans l'overlay global.
- Le spacer `h-[68px]` reste, mais il faut le rendre dynamique : si `isConnected && voiceState.channelName`, augmenter pour réserver la place de `VoiceControls` aussi.
  - Simplification : ajuster le spacer à `h-[68px]` toujours et compter sur le fait que `VoiceControls` flotte par-dessus le contenu défilable au besoin (l'overlay est fixed donc ne pousse pas). Pour éviter le chevauchement avec le dernier salon de la liste : passer le spacer à `h-[160px]` quand `isConnected`, sinon `h-[68px]`. `useVoice` est déjà importé.

#### `src/components/dm/DMPage.tsx`
- Idem : supprimer `<VoiceControls .../>` (lignes ~131-142) et appliquer le spacer dynamique.

#### `src/components/layout/VoiceControls.tsx`
- Inchangé fonctionnellement.
- Pour le visuel « léger gap entre VoiceControls et UserProfileCard » : `mx-1 mb-1` actuel reste, `UserProfileCard` a déjà `mx-2 mb-2` → gap visuel naturel via les marges. Ajuster `mx` à `mx-2` sur `VoiceControls` pour alignement parfait.

## Récap fichiers touchés

- **Modifié** : `src/components/profile/UserProfileCard.tsx` (taille boutons + chevrons + popovers)
- **Modifié** : `src/contexts/VoiceContext.tsx` (état `outputVolume` + setter qui applique aux `<audio>` distantes)
- **Modifié** : `src/pages/Index.tsx` (overlay englobant `VoiceControls` + `UserProfileCard`)
- **Modifié** : `src/components/layout/ChannelList.tsx` (retrait `VoiceControls` + spacer dynamique)
- **Modifié** : `src/components/dm/DMPage.tsx` (retrait `VoiceControls` + spacer dynamique)
- **Modifié** : `src/components/layout/VoiceControls.tsx` (`mx-2` pour alignement)
- **Créé** : `src/components/channels/voice/HeadphonesSettingsPopover.tsx`

## Hors scope

- Sélection du périphérique de sortie (`setSinkId`) : nécessiterait `enumerateDevices` + UI device picker → reportable.
- Mobile / tablette : inchangés.
- Volumes per-user : déjà gérés via clic-droit dans `VoiceParticipantContextMenu` — simple mention dans le popover casque.
