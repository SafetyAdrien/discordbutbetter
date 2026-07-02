# Plan : border-radius 20% sur les éléments interactifs du modal Settings

## Scope
`src/components/account-settings/AccountSettingsModal.tsx` — tous les éléments avec états hover/select du modal de paramètres.

## Changements
Remplacer les classes de border-radius par `rounded-[20%]` sur les éléments interactifs suivants :

| # | Ligne | Élément | Actuel | Nouveau |
|---|-------|---------|--------|---------|
| 1 | 180 | Bouton de résultat de recherche | `rounded-2xl` | `rounded-[20%]` |
| 2 | 212 | Bouton de navigation principal | `rounded-2xl` | `rounded-[20%]` |
| 3 | 221 | Conteneur d'icône nav principale | `rounded-full` | `rounded-[20%]` |
| 4 | 236 | Bouton de sous-section | `rounded-lg` | `rounded-[20%]` |
| 5 | 262 | Bouton Aide · Markdown | `rounded-2xl` | `rounded-[20%]` |
| 6 | 271 | Conteneur d'icône Aide | `rounded-full` | `rounded-[20%]` |
| 7 | 286 | Bouton Se déconnecter (sidebar) | `rounded-2xl` | `rounded-[20%]` |
| 8 | 287 | Conteneur d'icône déconnexion | `rounded-full` | `rounded-[20%]` |
| 9 | 294 | Bouton Supprimer mon compte (sidebar) | `rounded-2xl` | `rounded-[20%]` |
| 10 | 295 | Conteneur d'icône suppression | `rounded-full` | `rounded-[20%]` |
| 11 | 315 | Bouton Annuler (AlertDialog) | `rounded-full` | `rounded-[20%]` |
| 12 | 316 | Bouton Supprimer définitivement | `rounded-full` | `rounded-[20%]` |
| 13 | 364 | Section mobile Se déconnecter | `rounded-2xl` | `rounded-[20%]` |
| 14 | 386 | Bouton fermer mobile (home) | `rounded-full` | `rounded-[20%]` |
| 15 | 398 | Bouton retour mobile (sous-page) | `rounded-full` | `rounded-[20%]` |
| 16 | 404 | Bouton fermer mobile (sous-page) | `rounded-full` | `rounded-[20%]` |
| 17 | 443 | Bouton fermer desktop | `rounded-full` | `rounded-[20%]` |
| 18 | 474 | Section SettingsSection (carte mobile) | `rounded-2xl` | `rounded-[20%]` |
| 19 | 491 | Conteneur d'icône SettingsRow | `rounded-full` | `rounded-[20%]` |

## Non concernés
Les classes suivantes restent inchangées car elles ne sont pas des éléments hover/select du modal :
- Ligne 285 : divider `rounded-full` (1px, purement décoratif)
- Ligne 301 : `AlertDialogContent rounded-3xl` (conteneur de modale)
- Ligne 310 : `Input rounded-xl` (champ de saisie)
- Ligne 397 : `rounded-b-2xl` du header mobile (barre de titre)
- Ligne 422 : `rounded-3xl` du conteneur principal du modal

## Vérification
- `bunx tsgo --noEmit` : 0 erreur
- ESLint : aucune nouvelle erreur
- Contrôle visuel : les boutons et icônes de la sidebar affichent bien un squircle 20% au hover/select
