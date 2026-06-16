## Plan

**Cause exacte**
Après l'insertion d'une mention `#Blog `, le code de détection de trigger trouve le `#` au début et construit la requête `Blog ` (avec espace). `normalizeForSearch` supprime les espaces, ce qui donne `"blog"`. Ce mot matche le salon "Blog" → le menu se rouvre alors que `#Blog` est en réalité une mention déjà confirmée.

**Correction (dans `detectMentionTrigger`, `src/components/chat/MessageInput.tsx`)**

1. Avant de chercher un trigger, ignorer tout `#` ou `@` qui appartient au début d'une mention déjà confirmée (`mentionEntriesRef.current`). Concrètement: pour chaque entrée, retrouver sa position dans `beforeCursor` et marquer la plage `[start, start + display.length]` comme "zone réservée".

2. Quand on cherche le dernier `#` ou `@` avant le curseur, sauter ceux qui tombent dans une zone réservée.

3. Cela couvre les deux cas:
   - Cursor juste après `#Blog` → pas de réouverture.
   - Cursor après `#Blog ` (espace ajouté ou frappé manuellement) → pas de réouverture non plus tant que l'utilisateur n'a pas tapé un nouveau `@`/`#` plus loin.

4. La logique existante qui ferme déjà le menu quand `beforeCursor.endsWith(entry.display)` peut être supprimée (remplacée par la nouvelle, plus complète).

**Validation**
- Insérer `#Blog` via Tab/clic, taper espace puis du texte: le menu ne doit jamais se rouvrir.
- Taper un nouveau `#` ailleurs dans la phrase: le menu s'ouvre normalement.
- Idem pour `@mention` (user/role).
- Backspace dans la mention: comportement inchangé (suppression complète de la mention).