

# Centrer le textarea indépendamment dans le conteneur chatInput

## Probleme actuel

Le conteneur principal (ligne 429) utilise `flex items-center`, ce qui tente d'aligner verticalement le textarea ET les icones ensemble. Cela cree des conflits car le textarea et les icones ont des hauteurs/paddings differents.

## Nouvelle approche

Decoupler l'alignement vertical du textarea de celui des icones. Le textarea se centre dans le conteneur de maniere autonome, les icones s'alignent independamment.

## Changements

### Fichier : `src/components/chat/MessageInput.tsx`

1. **Conteneur parent (ligne 429)** : Remplacer `items-center` par `items-stretch` pour que chaque enfant occupe toute la hauteur et gere son propre centrage vertical.

2. **Bouton "+" (ligne 432-437)** : Ajouter `self-center` pour que le bouton reste centre verticalement de maniere independante.

3. **Textarea container (ligne 473)** : Ajouter `flex items-center` pour centrer le textarea dans son propre conteneur. Cela signifie que le textarea sera centre dans l'espace disponible sans dependre des icones.

4. **Textarea (ligne 475-497)** : Revenir a un padding vertical symetrique simple (`py-2.5` pour Desktop, `py-1` pour compact) au lieu du padding asymetrique `pt-[12px] pb-[8px]`. Le centrage sera gere par flexbox, pas par le padding.

5. **Boutons de droite (ligne 500)** : Ajouter `self-center` au conteneur des boutons emoji/sticker/send.

### Fichier : `src/components/chat/InputMarkdownOverlay.tsx`

6. **Overlay padding** : Revenir a un padding symetrique (`py-2.5` pour Desktop, `py-1` pour compact) pour rester synchronise avec le textarea.

## Resume des changements

| Fichier | Element | Changement |
|---------|---------|-----------|
| MessageInput.tsx | Conteneur parent | `items-center` vers `items-stretch` |
| MessageInput.tsx | Bouton + | Ajouter `self-center` |
| MessageInput.tsx | Textarea container | Ajouter `flex items-center` |
| MessageInput.tsx | Textarea | `pt-[12px] pb-[8px]` vers `py-2.5` |
| MessageInput.tsx | Boutons droite | Ajouter `self-center` |
| InputMarkdownOverlay.tsx | Overlay | `pt-[12px] pb-[8px]` vers `py-2.5` |

## Pourquoi ca marche

- Le textarea est centre par flexbox dans son propre conteneur, independamment des icones
- Les icones se centrent elles-memes via `self-center`
- Plus besoin de hacks de padding asymetrique
- L'overlay reste parfaitement synchronise avec le textarea

