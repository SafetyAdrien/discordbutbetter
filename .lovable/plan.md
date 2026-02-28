

# Input mobile : positionné en bas avec bordures arrondies

## Changements

### Fichier : `src/components/chat/MessageInput.tsx`

**Conteneur principal (ligne 392)** - Modifier le padding mobile :
- Actuellement : `px-2 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))]`
- Nouveau : `px-2 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))]` pour reduire le spacing au minimum

**Barre input (ligne 429)** - Ajouter des bords plus arrondis sur mobile :
- Actuellement : `rounded-lg`
- Nouveau : `rounded-2xl` (sur mobile) pour un aspect plus moderne et agreable, garder `rounded-lg` sur desktop

### Fichier : `src/components/chat/ChatArea.tsx`

**Conteneur input (ligne 1553)** - S'assurer qu'il colle bien en bas :
- Verifier que le conteneur `flex-shrink-0` reste bien ancre en bas sans spacing superflu

## Resume

| Element | Avant | Apres |
|---------|-------|-------|
| Padding mobile top | `py-1.5` (6px) | `pt-1` (4px) |
| Padding mobile bottom | `0.375rem` (6px) + safe area | `0.25rem` (4px) + safe area |
| Coins de la barre | `rounded-lg` (8px) | `rounded-2xl` (16px) sur mobile, `rounded-lg` sur desktop |

