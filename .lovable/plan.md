

# Amélioration du Header DM (conversation 1:1)

## Analyse actuelle (lignes 264-333)

Le header actuel est basique : avatar 32px sans indicateur de statut, nom + username empilés, et boutons d'action alignés à droite. Comparé à Discord, il manque :

1. **Indicateur de statut** sur l'avatar dans le header
2. **Layout horizontal** — Discord affiche le nom sur une seule ligne (pas de username en dessous dans le header)
3. **Séparateur vertical** entre le nom et les boutons d'action
4. **Icône @ devant le nom** — Discord utilise un symbole @ stylisé
5. **Taille des icônes d'action** — légèrement plus grandes (w-5 h-5)

## Changements proposés

**Fichier : `src/components/dm/DMConversation.tsx`** (lignes 264-333)

- Ajouter un **indicateur de statut** (pastille colorée) en bas à droite de l'avatar, utilisant les tokens `--online`, `--idle`, `--dnd`, `--offline`
- Remplacer le layout nom/username empilé par une **ligne unique** : icône `@` + `displayName` en `font-semibold text-base`
- Supprimer le `@username` secondaire (redondant dans un DM 1:1)
- Ajouter un **séparateur vertical** (`h-6 w-px bg-border`) entre le nom et les boutons d'action
- Augmenter les icônes d'action à `w-5 h-5` pour meilleure lisibilité
- Rendre le nom cliquable pour ouvrir le panel d'info utilisateur

1 fichier modifié, section header uniquement.

