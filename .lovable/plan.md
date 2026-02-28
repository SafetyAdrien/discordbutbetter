

# Ajuster le ChatInput sur mobile

## Probleme

Sur mobile, le champ de saisie (MessageInput) n'est pas colle au bas de l'ecran et le textarea n'est pas centre verticalement dans son conteneur.

## Solution

Modifier le composant `MessageInput` pour detecter le mobile et appliquer :
1. Un padding reduit (`px-2 py-1.5`) sur le conteneur principal en mobile
2. Un `pb-[env(safe-area-inset-bottom,0px)]` pour respecter les zones securisees iOS
3. Centrer verticalement le textarea avec `items-center` sur la rangee flex

## Changements

### Fichier : `src/components/chat/MessageInput.tsx`

1. **Conteneur principal (ligne ~385)** : En mode mobile (deja detecte via `isMobile`), appliquer un padding reduit et ajouter le safe-area-inset :
   - Remplacer `"px-4 py-3"` par `isMobile ? "px-2 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))]" : "px-4 py-3"`

2. **Rangee flex des controles (ligne ~422)** : Ajouter `items-center` pour que le textarea et les boutons soient centres verticalement dans la barre.

| Fichier | Changement |
|---------|-----------|
| `src/components/chat/MessageInput.tsx` | Padding mobile reduit + safe-area + centrage vertical du textarea |

