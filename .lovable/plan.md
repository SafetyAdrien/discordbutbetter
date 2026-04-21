

# Suppression de l'icône Reply dans RepliedLine

## Problème

Dans `src/components/chat/RepliedLine.tsx`, une icône `<Reply>` (flèche en haut-gauche) est rendue avant le mini-avatar de l'auteur cité. Cette icône est visuellement redondante avec le connecteur en L déjà présent et n'apparaît pas dans la référence Discord.

## Correctif

### `src/components/chat/RepliedLine.tsx`
- **Supprimer** le rendu du composant `<Reply>` (lignes ~232-235) qui affiche l'icône flèche.
- **Supprimer** l'import `Reply` de `lucide-react` (devenu inutile).
- Conserver tout le reste : connecteur en L (SVG), mini-avatar, pseudo coloré, badge `RoleBadgePopover`, aperçu du texte.

## Résultat attendu

La ligne de réponse affiche désormais uniquement :
```
┌─ [mini-avatar] @Adrien_Sama [HYTL] Test
   [Avatar] Adrien_Sama 13:11
            Test
```
Sans l'icône Reply parasite avant le mini-avatar, conformément à la capture de référence.

## Détails techniques

- Aucune autre modification : le connecteur L, le badge de rôle interactif et la structure (RepliedLine au-dessus du bloc avatar+contenu) restent inchangés.
- Aucun fichier auto-géré touché.

