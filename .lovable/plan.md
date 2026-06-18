## Objectif

Unifier le menu contextuel (clic droit) sur **tous les styles de messages** — messages d'utilisateurs classiques, messages système, sondages (polls), annonces (announcements), embeds de thread système — en utilisant `UniversalMessageContextMenu` comme socle commun, tout en préservant les actions spécifiques à chaque type.

## Approche

Plutôt que de dupliquer la logique du menu universel partout, on étend `UniversalMessageContextMenu` avec une nouvelle prop optionnelle `extraItems?: ReactNode` permettant d'injecter des actions spécifiques (ex. "Terminer le sondage", "Modifier le sondage", "Renommer le thread"). On retire ensuite les menus contextuels ad-hoc des composants spécialisés.

## Étapes

### 1. Extension de `UniversalMessageContextMenu`

- Ajouter prop `extraItems?: ReactNode` (rendue avant le séparateur final, après les actions universelles).
- Ajouter prop `variant?: 'message' | 'poll' | 'system'` pour adapter le texte/icônes du libellé "Copier l'ID" → "Copier l'ID du sondage", masquer "Répondre"/"Créer un thread"/"Copier le texte" quand inadapté.
- Conserver les comportements existants (mobile long-press sheet, raccourci Shift+Delete, dialog de confirmation).

### 2. Refactor des messages **Polls** (`ChatArea.tsx` lignes 1337-1472)

- Remplacer le `<ContextMenu>` ad-hoc par `<UniversalMessageContextMenu variant="poll">`.
- Injecter via `extraItems` : "Terminer le sondage", "Modifier le sondage", "Supprimer le sondage" (si propriétaire).
- Masquer "Copier le texte" (non pertinents pour un sondage).
- Conserver les réactions (déjà supportées par les polls).

### 3. Refactor des **messages système thread créé** (`ChatArea.tsx` lignes 1489-1673)

- Remplacer par `<UniversalMessageContextMenu variant="system">` avec actions limitées : copier lien, copier ID, supprimer (si modérateur).

### 4. Refactor de `ThreadSystemMessage.tsx`

- Remplacer le `<ContextMenu>` ad-hoc par `<UniversalMessageContextMenu variant="system">`.
- Injecter via `extraItems` : "Renommer le thread", "Supprimer le thread" (si `canManage`).
- Conserver les dialogs de renommage/suppression existants.

### 5. Refactor des messages **AnnouncementChannel** (lignes 750-812 et 1157-1198)

- Annonce publiée : `<UniversalMessageContextMenu variant="message">` avec actions standard + extra "Republier" si applicable.
- Messages classiques (1157+) : remplacer par `UniversalMessageContextMenu` standard.

### 6. Vérification

- Build automatique.
- Tester rapidement via session : clic droit sur un message normal, un sondage, un message système, une annonce → menu cohérent partout.
- Conserver les comportements mobile (long-press → MessagePreviewSheet).

## Fichiers modifiés

- `src/components/chat/UniversalMessageContextMenu.tsx` — ajout `extraItems` + `variant`
- `src/components/chat/ChatArea.tsx` — refactor Polls + messages système thread
- `src/components/threads/ThreadSystemMessage.tsx` — refactor
- `src/components/channels/AnnouncementChannel.tsx` — refactor 2 menus

## Hors scope

- Pas de modification du comportement mobile (long-press déjà géré par `UniversalMessageContextMenu`).
- Pas de modification des handlers métier (delete, edit, end poll, etc.) — uniquement la couche UI du menu.
- Pas de touche aux tests existants sauf si signatures cassées.

## Risques et atténuations

- **Risque** : casser les actions spécifiques (terminer sondage, renommer thread).
→ Mitigation : `extraItems` reste un slot libre, les handlers existants sont passés tels quels.
- **Risque** : régression UI mobile (sheet).
→ Mitigation : `UniversalMessageContextMenu` gère déjà mobile/desktop, aucun changement à ce niveau.
- **Risque** : style visuel différent des menus actuels.
→ Mitigation : le menu universel respecte déjà le design system shadcn ; cohérence améliorée.