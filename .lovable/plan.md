

# Mise à jour de l'infrastructure mobile pour les sondages

## Problème

Sur mobile, les sondages dans `ChatArea` et `ThreadView` utilisent un hover toolbar (`PollActions`) et un `ContextMenu` (clic droit) pour les actions (copier lien, terminer, modifier, supprimer). Ces deux mécanismes ne fonctionnent pas sur tactile : pas de hover, pas de clic droit.

Les messages normaux ont déjà un système d'appui long via `UniversalMessageContextMenu` qui ouvre un `Sheet` sur mobile. Les sondages n'ont pas cet équivalent.

## Plan

### 1. `ChatArea.tsx` — Appui long sur les sondages

- Importer `useLongPress` et `Sheet`/`SheetContent`
- Ajouter un état `mobilePollSheetId` pour tracker quel sondage a son sheet ouvert
- Envelopper chaque bloc de sondage dans un handler `useLongPress` (ou un composant wrapper) qui ouvre le Sheet
- Le Sheet affiche les actions : réactions rapides, copier le lien, copier l'ID, et si c'est le propre sondage : terminer (si pas expiré), modifier, supprimer
- Masquer le hover toolbar `PollActions` sur mobile (il ne sert à rien sur tactile)

### 2. `ThreadView.tsx` — Même traitement

- Ajouter le même système d'appui long + Sheet pour les sondages dans les threads
- Masquer le hover toolbar sur mobile

### 3. Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/components/chat/ChatArea.tsx` | Long-press + Sheet pour sondages mobile, masquer hover toolbar |
| `src/components/threads/ThreadView.tsx` | Long-press + Sheet pour sondages mobile, masquer hover toolbar |

Aucune migration SQL, aucun nouveau fichier.

