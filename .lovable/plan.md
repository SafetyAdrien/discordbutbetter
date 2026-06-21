## Modifications

### 1. `VoiceStatusBadge.tsx` — ajouter une rangée de contrôles média

Restructurer le composant en 2 sections empilées dans le même conteneur (rounded-2xl, surface-2) :

**Ligne 1 (status, inchangée)** :
- `VoiceConnectionIndicator` + "Vocal connecté" + nom du salon + bouton `PhoneOff` rouge

**Ligne 2 (nouvelle, séparée par `border-t border-border/40 pt-2 mt-2`)** :
4 boutons carrés (`w-8 h-8 rounded-lg`), légèrement espacés (`gap-1.5`), centrés :
- **Vidéo** : `Video` / `VideoOff` (lucide) — appelle `voiceCtx.toggleCamera()`, état actif rouge si `isCameraActive`
- **Partage d'écran** : `Monitor` / `MonitorOff` — appelle `voiceCtx.toggleScreenShare()`, état actif vert si `isScreenSharing`
- **Soundboard** : icône `Music2` — **désactivé** (`disabled`, `opacity-40 cursor-not-allowed`), tooltip "Bientôt disponible"
- **Krisp / Noise Suppression** : icône `Wand2` (ou `Sparkles`) — toggle entre `'off'` ↔ `'high'` via `voiceCtx.setNoiseSuppression()`, actif vert quand `noiseSuppression !== 'off'`

Chaque bouton avec `Tooltip`. Importer `useVoice` pour récupérer les états/actions.

### 2. `UserProfileCard.tsx` — chevrons orientés vers le haut quand popover ouvert

Pour les 2 popovers (micro et casque), utiliser le state `open` contrôlé du `Popover` afin de basculer l'icône :
- Convertir `MicrophoneSettingsPopover` et `HeadphonesSettingsPopover` triggers en composants contrôlés : passer `open`/`onOpenChange` (ajouter ces props si manquantes dans ces deux composants), et remplacer `<ChevronDown>` par `open ? <ChevronUp> : <ChevronDown>`.
- Importer `ChevronUp` depuis `lucide-react`.

*Si les popovers ne supportent pas `open` contrôlé*, ajouter les props `open?: boolean` et `onOpenChange?: (o: boolean) => void` et les forwarder au `<Popover>` interne.

### 3. `UserProfileCard.tsx` — réduire légèrement la hauteur

- Conteneur principal : `py-2` → `py-1.5`, `gap-3` → `gap-2.5`
- Avatar : `w-9 h-9` → `w-8 h-8`
- Nom : `text-[15px]` → `text-sm`
- Boutons mic/casque : `p-1.5` → `p-1`, icônes `w-4 h-4` → `w-[15px] h-[15px]`
- Bouton settings : `p-1.5` → `p-1`

### 4. Spacers — mettre à jour la hauteur réservée

Le badge devient plus haut (~96px : status 52px + média 44px). Mettre à jour dans `ChannelList.tsx` et `DMPage.tsx` le spacer "connecté" de `h-[130px]` → `h-[170px]`. Le spacer "non connecté" passe à `h-[64px]` (carte profil réduite).

## Validation

Screenshot de la sidebar après connexion vocale pour confirmer :
- la rangée de 4 boutons sous le bandeau status, dans le même conteneur
- chevrons pointant vers le haut quand les popovers sont ouverts
- carte profil visiblement plus compacte sans chevauchement
