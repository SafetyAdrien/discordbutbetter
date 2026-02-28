
Objectif: corriger le problème “copier / couper / coller” dans les modales, en particulier dans les écrans de paramètres de salon, sans casser les autres raccourcis clavier existants.

Constats après analyse du code + replay:
1) Le garde-fou clavier dans `src/components/ui/dialog.tsx` n’est pas fiable dans tous les cas:
   - `onKeyDown` est défini puis écrasé par `{...props}` (ordre actuel), donc si un écran passe son propre `onKeyDown`, la protection clipboard globale saute.
2) Plusieurs modales appliquent `e.stopPropagation()` sur *toutes* les touches dans `DialogContent`:
   - `src/components/modals/CreateChannelModal.tsx`
   - `src/components/modals/CreateCategoryModal.tsx`
   - `src/components/category-settings/EditCategoryModal.tsx`
   - `src/components/channels/media/CreateMediaPostModal.tsx`
   Ce pattern peut casser les raccourcis natifs sur certains navigateurs (notamment Firefox).
3) Dans `ChannelOverview`, le nom est reformatté à chaque frappe (`onChange`) en mode strict:
   - les caractères collés peuvent apparaître puis disparaître instantanément, ce qui donne l’impression que le collage “ne marche pas”.

Plan d’implémentation:

1) Fiabiliser la gestion clavier globale des dialogs
- Fichier: `src/components/ui/dialog.tsx`
- Modifications prévues:
  - Extraire `onKeyDown` depuis `props` (ex: `({ className, children, onKeyDown, ...props }, ref)`).
  - Composer le handler interne + le handler externe au lieu d’en écraser un:
    - interne: laisser passer les raccourcis natifs `Ctrl/Cmd + C/V/X/A` (protection anti-interception globale)
    - externe: appeler `onKeyDown?.(e)` ensuite (ou avant selon la convention choisie, mais de façon déterministe).
  - Garder le comportement actuel des dialogs, sans régression sur fermeture Escape/focus.

2) Supprimer les blocages clavier “globaux” dans les modales locales
- Fichiers:
  - `src/components/modals/CreateChannelModal.tsx`
  - `src/components/modals/CreateCategoryModal.tsx`
  - `src/components/category-settings/EditCategoryModal.tsx`
  - `src/components/channels/media/CreateMediaPostModal.tsx`
- Modifications prévues:
  - Remplacer `e.stopPropagation()` inconditionnel par une logique ciblée:
    - gérer uniquement `Escape` (si nécessaire)
    - ne pas bloquer la propagation de toutes les autres touches.
  - Résultat attendu: les raccourcis natifs de texte restent fonctionnels dans les inputs/textareas.

3) Rendre l’édition de nom de salon compatible avec le collage (sans perdre la règle “strict”)
- Fichiers:
  - `src/components/channel-settings/ChannelOverview.tsx`
  - `src/components/modals/CreateChannelModal.tsx`
- Modifications prévues:
  - Ne plus reformater en direct dans `onChange` (conserver la valeur saisie/collée telle quelle dans l’input).
  - Appliquer le format strict au moment de sauvegarder/créer (déjà partiellement en place, à harmoniser).
  - Ajuster la détection de changements (`hasChanges`) pour comparer la valeur “effective” (normalisée en mode strict), afin d’éviter des faux changements.
  - Ajouter un message d’aide discret en mode strict (ex: “certains caractères seront convertis à l’enregistrement”) pour éviter l’effet “coller ne marche pas”.

4) Vérification manuelle ciblée
- Cas à tester:
  - Dans “Paramètres de salon” (nom + description):
    - Ctrl/Cmd + A, C, X, V dans Firefox et Chrome.
  - Dans les modales listées ci-dessus:
    - les raccourcis natifs fonctionnent toujours.
    - Escape ferme correctement.
  - En mode “noms stricts”:
    - le collage est visible pendant l’édition.
    - à l’enregistrement, le formatage strict est bien appliqué.
  - En mode “noms flexibles”:
    - aucun formatage forcé.
- Critère de succès:
  - plus de sensation de raccourcis bloqués, et comportement cohérent entre toutes les modales.

Notes techniques complémentaires:
- Aucun changement backend requis.
- Cette correction reste alignée avec les conventions existantes (Radix Dialog + hooks clavier globaux).
- Le warning console “Function components cannot be given refs” observé sur `ChannelDangerZone` est séparé du bug clipboard; je le laisserai hors scope de ce correctif pour éviter d’introduire des changements non liés.
