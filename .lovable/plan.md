
# Appui long dans le vide - Popup de creation rapide

## Objectif

Permettre a l'utilisateur de maintenir appuye dans une zone vide de la liste des salons pour afficher un popover avec deux raccourcis : "Creer un salon" et "Creer une categorie".

## Changements

### Fichier : `src/components/mobile/MobileChannelListView.tsx`

1. **Ajouter deux states** :
   - `showEmptyLongPressMenu` (boolean) pour afficher/masquer le popover
   - `showCreateChannel` et `showCreateCategory` (boolean) pour les modals de creation

2. **Ajouter un handler d'appui long sur le conteneur** de la liste (le `div` avec `className="flex-1 overflow-y-auto py-2 px-2"` ligne 360) :
   - `onTouchStart` : demarre un timer de 500ms. Verifie que le touch ne cible pas un bouton/element interactif (via `e.target`) pour ne se declencher que dans le "vide"
   - `onTouchEnd` / `onTouchMove` : annule le timer

3. **Ajouter un Popover** positionne au centre ou en bas de la zone, contenant deux boutons :
   - "Creer un salon" (icone `Plus`) -> ouvre `CreateChannelModal`
   - "Creer une categorie" (icone `Plus`) -> ouvre `CreateCategoryModal`

4. **Ajouter les modals** `CreateChannelModal` et `CreateCategoryModal` en bas du composant (imports deja presents)

### Detail technique

Le handler d'appui long sur le conteneur doit verifier que l'element touche est bien le conteneur lui-meme ou un espace vide (pas un bouton de salon/categorie). On utilisera une verification du type :

```text
const target = e.target as HTMLElement;
if (target.closest('button') || target.closest('[role="button"]')) return;
```

Cela garantit que l'appui long sur un salon ou une categorie declenche leur propre menu, pas celui du vide.

Le popover sera implemente avec un Dialog/Popover centre (utilisant le composant `Popover` existant avec un `PopoverTrigger` invisible ou un simple Dialog conditionnel).
