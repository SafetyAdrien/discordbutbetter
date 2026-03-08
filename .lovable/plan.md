

# Correctif spacing DMs — alignement Discord

En comparant avec Discord, voici les problèmes de spacing identifiés :

## Problèmes actuels
- **Boutons Amis/Inbox** : `px-3 py-2 gap-3` — le padding vertical est trop grand, le gap aussi
- **Séparateur "Messages Privés"** : `px-2 pt-3 py-1` + `mb-2` sur le titre + `mb-2` sur la ligne — trop d'espace vertical accumulé
- **Liste DM** : `px-2 py-2 space-y-1` — le `py-2` en haut ajoute du padding superflu car le séparateur en a déjà
- **Items DM** : `px-2 py-2 gap-3 rounded-xl` — le padding et gap sont légèrement trop grands vs Discord

## Changements (alignement Discord)

**1. `DMPage.tsx`** — Navigation (Amis / Boîte de réception)
- Boutons : `px-2 py-1.5 gap-3 rounded-md` (Discord utilise ~6px vertical, border-radius petit)
- Bloc séparateur : réduire à `px-2 pt-4 pb-1`, supprimer les `mb-2` redondants, label avec `px-2 text-[11px] font-semibold uppercase tracking-wider` sans margin-bottom

**2. `DMList.tsx`** — Liste des conversations
- Container : `px-2 space-y-[2px]` (pas de `py-2`, quasi pas de gap entre items)
- Items : `px-2 py-1 gap-2 rounded-md` (Discord : items compacts, petit border-radius, gap réduit)
- Avatar : garder `w-8 h-8`

3 zones de spacing corrigées, 2 fichiers modifiés.

