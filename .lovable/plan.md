

# Appliquer le formatage strict a tous les types de salons

## Probleme actuel

Le formatage strict (minuscules + tirets) ne s'applique qu'aux salons de type `text`. Sur Fluxer, quand l'option est OFF, **tous** les types de salons sont concernes.

## Corrections

### 1. CreateChannelModal.tsx (ligne 162)
- Remplacer `(!isFlexible && type === 'text')` par `!isFlexible`
- Meme chose pour le placeholder (ligne 164) et le handleSubmit (ligne 102)

### 2. ChannelOverview.tsx (ligne 55)
- Simplifier `shouldFormatStrict` de `!isFlexible && (channel.type === 'text' || channelType === 'text')` a `!isFlexible`

Ainsi, quand le reglage est OFF, aucun salon ne permet les majuscules ni les espaces, peu importe son type.

