
# Ajouter les boutons "Créer un salon", "Créer une catégorie" et "Signaler le serveur" dans la carte du serveur mobile

## Résumé

Trois nouveaux boutons seront ajoutés en bas de la carte du serveur (Sheet) sur mobile, après la section des emojis : "Créer un salon", "Créer une catégorie" et "Signaler le serveur". Les deux premiers ouvriront les modales existantes (`CreateChannelModal` et `CreateCategoryModal`), le troisième ouvrira le `ReportModal` existant.

## Détails techniques

### Fichier : `src/components/mobile/MobileChannelListView.tsx`

**Imports à ajouter :**
- `Plus`, `Flag` depuis `lucide-react`
- `CreateChannelModal` depuis `@/components/modals/CreateChannelModal`
- `CreateCategoryModal` depuis `@/components/modals/CreateCategoryModal`
- `ReportModal` depuis `@/components/chat/ReportModal`
- `Separator` depuis `@/components/ui/separator`

**Dans `ServerProfileSheet` (lignes 72-236) :**

1. Ajouter 3 états : `showCreateChannel`, `showCreateCategory`, `showReportServer`
2. Après la section emojis (ligne 232) et avant la fermeture du `</div>` principal, ajouter :
   - Un `<Separator />`
   - Une section "Actions" contenant 3 boutons stylisés :
     - **Créer un salon** (icône `Plus`) -- ouvre `CreateChannelModal`
     - **Créer une catégorie** (icône `Plus`) -- ouvre `CreateCategoryModal`
     - **Signaler le serveur** (icône `Flag`, couleur destructive) -- ouvre `ReportModal`
3. Rendre les modales conditionnellement sous le Sheet

Les boutons seront des `<button>` pleine largeur avec un style cohérent (fond `muted/50`, texte à gauche, icône + label), similaire aux patterns existants dans l'app.
