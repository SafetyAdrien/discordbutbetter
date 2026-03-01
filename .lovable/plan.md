

# Transformer le modal catégorie mobile en petite popup avec tabs

## Changement

Remplacer l'interface plein écran actuelle (navigation a 2 niveaux) par une petite popup compacte avec les onglets "Apercu" et "Permissions" directement visibles en haut, comme la version desktop mais dans un format popup.

## Details techniques

### Fichier : `src/components/category-settings/EditCategoryModal.tsx`

**Supprimer la branche mobile fullscreen** (lignes 80-135) et utiliser le meme rendu `ResponsiveModal` avec tabs pour mobile et desktop.

Le composant utilisera une seule vue pour les deux cas :
- Un `Dialog` compact avec les `Tabs` ("Apercu", "Permissions") en haut
- Le contenu scrollable en dessous
- Plus besoin de la navigation a 2 niveaux (menu -> sous-page -> retour)
- Suppression de l'import `useBreakpoint` et de la condition `isMobile`

Le resultat sera un modal compact identique sur mobile et desktop, avec les deux onglets cliquables en haut et le contenu correspondant en dessous.

