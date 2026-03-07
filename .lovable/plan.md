

# ChatInput marge + Pill indicator + Message hover spacing

## 1. ChatInput — marge sur les côtés et le bas
**Fichier**: `src/components/chat/ChatArea.tsx` (ligne 1815)
- Augmenter le padding du container : `px-4 pb-4 pt-2` → `px-5 pb-5 pt-2`
- Cela ajoute une marge visible entre le ChatInput et les bords du panneau

## 2. Pill indicator — flush avec le bord de l'écran
**Fichier**: `src/components/layout/ServerList.tsx`
- Le container fait 80px, l'icône 52px centrée → 14px de marge côté gauche
- Changer tous les `absolute -left-[6px]` en `absolute -left-[14px]` pour que le pill touche le bord gauche du container (lignes ~119, ~460, ~464, ~467)

## 3. Message hover — espacement bas entre les messages
**Fichier**: `src/components/chat/ChatArea.tsx` (ligne ~1377)
- Ajouter `mb-0.5` aux éléments `.message-hover` pour créer un micro-espace entre chaque message
- Même chose pour les polls (ligne ~1161)

**Fichier**: `src/index.css` (ligne ~327)
- Ajouter `margin-bottom: 2px` au `.message-hover` pour un espacement global cohérent

