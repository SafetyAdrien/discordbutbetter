

# Corrections mobile : Threads et Recherche

## 1. Threads Popover - Adapter la taille du conteneur

### Probleme
Le composant `ThreadsPopover` utilise des dimensions fixes `h-[450px] w-[380px]` (ligne 38). Dans le Sheet mobile des membres (max 320px de large), ce conteneur deborde largement de l'ecran.

### Solution
Remplacer les dimensions fixes par des dimensions responsives dans `ThreadsPopover.tsx` :
- `w-[380px]` devient `w-full max-w-[380px]`
- `h-[450px]` devient `max-h-[350px] sm:h-[450px]`

De plus, dans `MobileChatView.tsx`, le `PopoverContent` qui encapsule le `ThreadsPopover` a `w-80` (320px). On le change en `w-[calc(85vw-1rem)] max-w-80` pour s'adapter a la largeur du Sheet mobile.

### Fichier modifie
- `src/components/threads/ThreadsPopover.tsx` (ligne 38) : dimensions responsives
- `src/components/mobile/MobileChatView.tsx` (ligne 162) : largeur du PopoverContent

---

## 2. Recherche - Popup de filtres qui deborde sur mobile

### Probleme
Le `GlobalSearchModal` affiche une liste de 9 prefixes de recherche dans un dropdown absolu (`showPrefixSuggestions`, lignes 445-465). Sur mobile, ce dropdown deborde du conteneur.

### Solution
Integrer les suggestions de filtres directement dans le corps du modal sur mobile, au lieu d'un dropdown absolu flottant :
- Sur mobile (`isMobile`), afficher les prefixes sous forme de chips/tags horizontaux scrollables sous l'input, faisant partie du flux normal du document (pas de positionnement absolu)
- Sur desktop, conserver le dropdown actuel

Concretement dans `GlobalSearchModal.tsx` :
1. Extraire le bloc `showPrefixSuggestions` dans un rendu conditionnel
2. Sur mobile : afficher les prefixes comme une grille 2 colonnes compacte ou une liste horizontale scrollable directement sous l'input (sans `absolute`, sans `z-50`)
3. Sur desktop : garder le rendu actuel avec `absolute z-50 top-full`

### Fichier modifie
- `src/components/modals/GlobalSearchModal.tsx` : rendu conditionnel mobile/desktop des suggestions de prefixes

---

## Resume des fichiers modifies

| Fichier | Modification |
|---|---|
| `src/components/threads/ThreadsPopover.tsx` | Dimensions responsives du conteneur |
| `src/components/mobile/MobileChatView.tsx` | Largeur du PopoverContent des threads |
| `src/components/modals/GlobalSearchModal.tsx` | Filtres inline sur mobile au lieu d'un dropdown absolu |

