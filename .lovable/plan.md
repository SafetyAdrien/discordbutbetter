

# Supprimer le double header mobile et deplacer les icones

## Probleme

Sur mobile, deux barres de header sont visibles :
1. **Header MobileChatView** (en haut) : `< # NOM` + icone membres -- c'est celui qu'on garde
2. **Header interne ChatArea** (en dessous) : `# NOM` + cloche + resume + epingle + membres + threads -- c'est celui qu'on doit cacher sur mobile

Les icones utiles du header ChatArea (notifications, epingles, threads) doivent etre deplacees.

## Solution

### 1. Cacher le header interne de ChatArea sur mobile

Dans `src/components/chat/ChatArea.tsx`, entourer le bloc header (ligne ~786, le `div.h-12` avec les icones) d'une condition `!isMobile` pour ne pas le rendre sur mobile. Cela supprime completement la deuxieme barre visible dans la capture.

### 2. Ajouter les icones utiles dans le panel membres (Sheet) de MobileChatView

Dans `src/components/mobile/MobileChatView.tsx`, a l'interieur du `SheetContent` qui contient le `MemberList`, ajouter une barre d'actions en haut du sheet avec :
- **Notifications** (Bell) : popover ou bouton pour configurer les notifications du salon
- **Messages epingles** (Pin) : bouton qui affiche les messages epingles
- **Threads** (StreamlineThreads) : bouton qui affiche les threads du salon

Ces icones seront affichees dans une rangee horizontale au-dessus de la liste de membres, dans le sheet lateral droit.

### 3. Props supplementaires pour MobileChatView

Passer le `channelId` aux composants de threads et de messages epingles a l'interieur du sheet pour qu'ils puissent charger les donnees correctes.

## Fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `src/components/chat/ChatArea.tsx` | Cacher le header (`h-12` + icones) quand `isMobile` est vrai |
| `src/components/mobile/MobileChatView.tsx` | Ajouter une barre d'icones (notifications, pins, threads) en haut du Sheet des membres |

## Resultat attendu

- Un seul header visible sur mobile (celui de MobileChatView avec le bouton retour)
- Les fonctions notifications, epingles et threads accessibles via le panneau membres (icone en haut a droite du header)
- Aucun changement sur desktop
