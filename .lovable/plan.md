

# Aligner "Supprimer le salon" et "Enregistrer" sur une même ligne

## Problème

Les deux boutons sont dans des composants séparés empilés verticalement — `ChannelOverview` a son footer sticky avec "Enregistrer", puis `ChannelDangerZone` ajoute "Supprimer" en dessous. Cela décale le layout.

## Solution

Fusionner les deux boutons dans un seul footer sticky au bas de `ChannelOverview` : "Supprimer" à gauche, "Enregistrer" à droite, avec `justify-between`.

### `src/components/channel-settings/ChannelOverview.tsx`
- Ajouter les props `channelId`, `channelName`, `serverId`, `onDeleted`
- Intégrer `ChannelDangerZone` (son bouton destructive) directement dans le footer sticky existant
- Footer : `flex justify-between` → bouton Supprimer à gauche, bouton Enregistrer à droite

### `src/components/channel-settings/ChannelSettingsModal.tsx`
- Retirer `<ChannelDangerZone>` du rendu de l'onglet overview (lignes 63, 100, 143)
- Passer `channelId`, `channelName={channel.name}`, `serverId`, `onDeleted={onClose}` à `<ChannelOverview>`

