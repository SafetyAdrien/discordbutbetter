## Plan

**Objectif**
Empêcher le curseur de se placer à l'intérieur d'une mention. Les flèches gauche/droite, ainsi qu'un clic à l'intérieur d'une mention, doivent toujours envoyer le curseur soit juste avant, soit juste après la mention.

**Implémentation (dans `src/components/chat/MessageInput.tsx`)**

1. **Helper "range d'une mention"** — Utiliser la même logique que pour `reserved` (déjà calculée dans `detectMentionTrigger`) pour retrouver, à un index donné, la plage `[start, end]` d'une mention si l'index tombe à l'intérieur.

2. **Touches ArrowLeft / ArrowRight (sans Shift, sans modificateur)** dans `handleKeyDown`:
   - ArrowRight: si le caret est à `start` d'une mention, sauter directement à `end`.
   - ArrowLeft: si le caret est à `end` d'une mention, sauter directement à `start`.
   - Si le caret se trouve strictement à l'intérieur (bug récupération), le repositionner à la limite la plus proche.
   - Si Shift est tenu (sélection), on laisse le comportement natif.

3. **Sélection / clic via `onSelect` sur le textarea**:
   - Ajouter un handler qui, après chaque changement de selection (clic, drag, focus), vérifie si `selectionStart` (et/ou `selectionEnd`) tombe à l'intérieur d'une mention.
   - Si oui, replacer le caret à la limite la plus proche (`start` ou `end`).
   - Si la sélection couvre partiellement une mention, étendre la sélection pour englober la mention entière (pour que copier/supprimer fonctionne logiquement).

4. **Pas de modification du texte ni du rendu**. Cette correction est purement comportementale au niveau du caret.

**Validation**
- Tab/clic sur une mention `@Adrien Moulin` → flèches gauche/droite sautent toute la mention.
- Clic au milieu de la mention → caret repositionné automatiquement à la limite la plus proche.
- Sélection avec Shift+flèche traverse la mention en bloc.
- Comportement inchangé hors mention.