

# Épaissir la hauteur du ChatInput

## Changement

Augmenter la hauteur minimale du textarea (mode non-compact) de **40px → 44px**, et ajuster le padding vertical de `py-2.5` → `py-3` pour un input visuellement plus épais.

## Fichier modifié : `src/components/chat/MessageInput.tsx`

3 zones à modifier :

1. **Constante `DESKTOP_MIN_HEIGHT`** (ligne 115) : `40` → `44`
2. **Classe du textarea** (ligne 577) : `min-h-[40px]` → `min-h-[44px]`, `py-2.5` → `py-3`
3. **Classe de l'overlay markdown** (ligne 559) : `min-h-[40px]` → `min-h-[44px]`, `py-2.5` → `py-3`

Aucun autre fichier impacté — le `MessageInput` est le composant universel utilisé partout (salons, DMs, threads, voice chat).

