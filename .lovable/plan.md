

# Correction du Coller (Ctrl+V) et Modale de creation de poste Media

## 1. Correction du raccourci Coller (Ctrl+V) dans les modales

**Probleme** : Les modales de creation/modification de salons et categories ont un `onKeyDown` sur le `DialogContent` qui intercepte les evenements clavier. Bien que seul Escape soit explicitement gere, la propagation des evenements peut interferer avec les raccourcis natifs du navigateur (Ctrl+V, Ctrl+C, Ctrl+A, etc.) en combinaison avec le hook global `useKeyboardShortcuts`.

**Solution** : Ajouter un garde dans les `onKeyDown` des `DialogContent` pour stopper la propagation des combinaisons clavier natives (Ctrl/Cmd + touche) sauf Escape. Cela garantit que Ctrl+V, Ctrl+C, Ctrl+A, etc. fonctionnent normalement dans les inputs des modales.

**Fichiers concernes** :
- `src/components/modals/CreateChannelModal.tsx` - Ajouter `e.stopPropagation()` pour les events non-Escape quand le focus est dans un input
- `src/components/modals/CreateCategoryModal.tsx` - Meme correction
- `src/components/category-settings/EditCategoryModal.tsx` - Meme correction
- `src/hooks/useKeyboardShortcuts.ts` - Ajouter une verification supplementaire pour ne pas intercepter les combinaisons natives quand un Dialog est ouvert (verifier `[role="dialog"]` dans le DOM path)

## 2. Modale de creation de poste pour le Media Channel

**Objectif** : Remplacer le flux actuel (selection fichier -> staging area directe) par un flux avec une modale dediee qui permet de renseigner un titre, une description et le texte alternatif (ALT) de l'image avant publication.

### Nouveau composant : `CreateMediaPostModal`

**Emplacement** : `src/components/channels/media/CreateMediaPostModal.tsx`

**Contenu de la modale** :
- Apercu de l'image/video selectionnee (en haut)
- Champ **Titre** : obligatoire, texte libre
- Champ **Description** : minimum 10 caracteres, maximum 500 caracteres, avec compteur de caracteres visible
- Champ **Texte alternatif (ALT)** : optionnel, deplace depuis la staging area vers cette modale
- Option Spoiler (checkbox)
- Boutons Annuler / Publier (Publier desactive si titre vide ou description < 10 caracteres)

### Modifications dans `MediaChannel.tsx`

- Le bouton "Televerser" et le drop zone ouvrent d'abord un file picker
- Une fois le fichier selectionne, la modale `CreateMediaPostModal` s'ouvre avec l'apercu du fichier
- L'utilisateur remplit titre, description et ALT dans la modale
- Le bouton "Publier" declenche l'upload

### Flux utilisateur

```text
[Clic Televerser / Drop fichier]
         |
   [Selection fichier]
         |
   [CreateMediaPostModal s'ouvre]
   - Apercu du media
   - Titre (obligatoire)
   - Description (10-500 caracteres)
   - Texte ALT (optionnel)
   - Spoiler (checkbox)
         |
   [Publier] -> Upload + Fermeture
```

## Detail technique

### Fichiers a creer
- `src/components/channels/media/CreateMediaPostModal.tsx`

### Fichiers a modifier
- `src/components/channels/MediaChannel.tsx` : integrer la nouvelle modale, ouvrir apres selection de fichier
- `src/components/modals/CreateChannelModal.tsx` : fix paste
- `src/components/modals/CreateCategoryModal.tsx` : fix paste
- `src/components/category-settings/EditCategoryModal.tsx` : fix paste
- `src/hooks/useKeyboardShortcuts.ts` : ne pas interferer avec les modales

