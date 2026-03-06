

# Corriger le style de la spine du message système thread

## Problème

La spine actuelle dans `ChatArea.tsx` (lignes 1305-1308) utilise un style custom avec `left-[7px]`, `w-0.5`, `rounded-bl-xl` qui ne correspond pas au style exact du `ThreadSpine` existant dans le projet.

## Plan

### `src/components/chat/ChatArea.tsx` — lignes 1303-1308

Remplacer la spine custom par le composant `ThreadSpine` existant ou reproduire son style exact :
- `left-5` (20px) au lieu de `left-[7px]`
- `border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg` (comme ThreadSpine)
- Largeur du conteneur : `w-[52px]` au lieu de `w-8`
- Ligne verticale : `w-0.5 bg-muted-foreground/30` avec `height: calc(100% - 10px)`
- Courbe : `w-[18px] h-[10px]` positionnée à `top-1/2 -translate-y-1/2`

Essentiellement, remplacer le bloc spine par `<ThreadSpine />` dans un conteneur `relative` avec la bonne hauteur, ou dupliquer les valeurs exactes de `ThreadSpine.tsx`.

| Fichier | Changement |
|---|---|
| `src/components/chat/ChatArea.tsx` | Aligner le style spine sur `ThreadSpine` |

