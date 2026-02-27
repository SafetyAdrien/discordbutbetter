

# Autoriser les majuscules pour les salons Vocaux et Stage en mode strict

## Contexte
Actuellement, quand le reglage `flexible_channel_names` est desactive, **tous** les types de salons sont forces en minuscules avec tirets. Or, dans Discord, les salons vocaux et stage conservent leur casse libre (majuscules autorisees) meme en mode strict. Il faut reproduire ce comportement.

## Changements

### Logique
Les types `voice` et `stage` sont exemptes du formatage strict. Le formatage ne s'applique qu'aux types : `text`, `forum`, `announcement`, `media`, `calendar`, `tasks`.

### Fichiers a modifier

**1. `src/components/modals/CreateChannelModal.tsx`**
- Ajouter une condition : si le type selectionne est `voice` ou `stage`, ne pas appliquer `formatStrictChannelName`, meme si `isFlexible` est `false`
- Mettre a jour le placeholder dynamiquement ("Nouveau salon" pour voice/stage, "nouveau-salon" pour les autres en mode strict)
- Appliquer la meme logique dans `onChange` et dans `handleSubmit`

**2. `src/components/channel-settings/ChannelOverview.tsx`**
- Ajouter la meme exemption : si `channel.type` est `voice` ou `stage`, `shouldFormatStrict` reste `false`
- Ajuster le `useEffect` de reformatage et le `onChange` pour respecter cette regle

### Detail technique

Dans les deux fichiers, la condition devient :
```
const isExemptFromStrict = type === 'voice' || type === 'stage';
const shouldFormatStrict = !isFlexible && !isExemptFromStrict;
```

Cela garantit que :
- Les salons vocaux et stage acceptent les majuscules et espaces librement
- Les autres types continuent d'etre forces en minuscules-tirets quand le mode strict est actif

