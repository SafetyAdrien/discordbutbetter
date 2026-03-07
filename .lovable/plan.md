

# Trois ajustements visuels

## 1. ChatInput — marges latérales et basses plus généreuses
**Fichier**: `src/components/chat/ChatArea.tsx` (ligne 1815)
- Changer `px-4 pb-4 pt-2` → `px-5 pb-5 pt-2` pour ajouter un peu plus d'espace sur les côtés et le bas

## 2. Pill indicator — aligné au bord de l'écran
**Fichier**: `src/components/layout/ServerList.tsx`
- Tous les indicateurs pill (lignes ~119, ~460, ~464, ~467) : changer `-left-[6px]` → `-left-[14px]` pour que le pill touche le bord gauche de l'écran (les icônes sont centrées dans 80px avec ~14px de marge de chaque côté)

## 3. Message hover — espacement bas entre messages
**Fichier**: `src/index.css` (ligne ~327)
- Ajouter `margin-bottom: 2px` à `.message-hover` pour créer un petit espace entre les messages au survol et au repos

