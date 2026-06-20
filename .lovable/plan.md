## Objectif

Trois extensions du système Markdown, à appliquer partout (desktop + mobile) :

1. **Aperçu WYSIWYG dans tous les champs de saisie** Markdown (overlay `InputMarkdownOverlay`).
2. **Markdown dans les *topics* (descriptions) de tous les types de salons**, en affichage et en édition.
3. **Alertes GitHub-style** (`> [!NOTE]` / `> [!TIP]` / `> [!IMPORTANT]` / `> [!WARNING]` / `> [!CAUTION]`) dans le renderer.

---

## 1) Overlay WYSIWYG sur tous les composers

Aujourd'hui l'overlay n'est branché que sur `MessageInput` (chat principal) et `MarkdownLiveTextarea` (bios). Les `<Textarea>` listés ci-dessous tapent encore en texte brut.

**Refactor** : extraire `src/components/chat/MarkdownTextarea.tsx` — wrap `<Textarea>` + `<InputMarkdownOverlay>` synchronisés (scroll, font-metrics, padding, markers ~55 % d'opacité, ref forwardée pour `HTMLTextAreaElement` et auto-resize). `MessageInput` consomme ce composant ; chaque site ci-dessous remplace son `<Textarea>` par `<MarkdownTextarea>`.

Sites à patcher :

- **Édition inline de message** : `ChatArea.tsx` (≈ l. 1704 et 1824), `DMConversation.tsx` (≈ l. 581), `ThreadView.tsx` (≈ l. 952), `VoiceChannelChat.tsx` (≈ l. 316), `AnnouncementChannel.tsx` (édition annonce + commentaire, ≈ l. 976 et 1086).
- **Composers Markdown dédiés** : `announcement/AnnouncementComposer.tsx` (≈ l. 335), `announcement/CreateAnnouncementModal.tsx` (≈ l. 165), `media/CreateMediaPostModal.tsx` (≈ l. 251).
- **Topic / description de salon** (édition) : `channel-settings/ChannelOverview.tsx` (≈ l. 264).

Mobile : `MobileDMConversation`, `MobileChatView`, `MobileThreadView` consomment déjà `MessageInput` → bénéficient automatiquement du refactor. Pas d'édition inline mobile à patcher.

Hors scope : bios (déjà sur `MarkdownLiveTextarea`), question de sondage, description de serveur (reste texte brut tant que produit ne valide pas le Markdown serveur).

---

## 2) Topics Markdown sur tous les types de salons

Le topic est déjà rendu via `MarkdownText` sur le header desktop du chat texte (`ChatArea.tsx:1109`). À aligner ailleurs :

- **Affichage** : passer `channel.description` à `MarkdownText variant="chat"` (inline-compact) au lieu de `<p>{description}</p>` dans :
  - `channels/VoiceChannelView.tsx` (≈ l. 171)
  - `channels/AnnouncementChannel.tsx` (≈ l. 537 et 542)
  - `channels/StageChannel.tsx`, `ForumChannel.tsx`, `MediaChannel.tsx`, `CalendarChannel.tsx`, `TasksChannel.tsx`, `LinkChannel.tsx` — wherever the header/sidebar renders the topic (ajouter le rendu Markdown s'il y en a un, sinon noter qu'il n'y en a pas).
  - Mobile : `mobile/MobileChannelDetailSheet.tsx` (≈ l. 60) → `MarkdownText variant="chat"` à la place du `<p>`.
- **Édition** : `ChannelOverview.tsx` → `MarkdownTextarea` (cf. point 1) pour saisir le topic en WYSIWYG.

Aucun changement de schéma : `channels.description` est déjà du texte libre.

---

## 3) Alertes GitHub-style dans le renderer

Étendre `src/lib/markdown.tsx` pour reconnaître le bloc :

```
> [!TYPE]
> Contenu sur une ou plusieurs lignes commençant par `> `
```

avec `TYPE ∈ {NOTE, TIP, IMPORTANT, WARNING, CAUTION}` (case-insensitive). Le bloc entier remplace la séquence de blockquotes consécutifs.

### Parsing (`parseMarkdown`)
- Dans le pré-parse des lignes, lorsqu'une ligne `> [!TYPE]` est rencontrée, regrouper toutes les lignes `>`-préfixées suivantes en un nouveau bloc `{ type: 'alert', alertType, content }` (content = jointure des lignes sans le `> `).
- Si le type est inconnu, retomber sur le rendu blockquote actuel.

### Rendu
- Nouveau case `'alert'` rendant :
  ```
  <div role="note" class="border-l-[4px] pl-3 my-1.5" style="border-color: var(--alert-{type}-border)">
    <div class="flex items-center gap-1.5 font-semibold mb-0.5" style="color: var(--alert-{type}-fg)">
      <Icon /> {Label localisé FR}
    </div>
    <div>{renderInlineContent(content)}</div>
  </div>
  ```
- Icônes (lucide-react) :
  - NOTE → `Info` (bleu)
  - TIP → `Lightbulb` (vert)
  - IMPORTANT → `MessageSquareWarning` (violet)
  - WARNING → `TriangleAlert` (ambre)
  - CAUTION → `OctagonAlert` (rouge)
- Labels FR : `Note`, `Astuce`, `Important`, `Avertissement`, `Attention`.

### Tokens (`src/index.css`)
Ajouter des variables HSL sémantiques (light + dark) :
```
--alert-note-fg / --alert-note-border    (bleu)
--alert-tip-fg / --alert-tip-border      (vert)
--alert-important-fg / --alert-important-border (violet)
--alert-warning-fg / --alert-warning-border (ambre)
--alert-caution-fg / --alert-caution-border (rouge)
```
Valeurs alignées sur la palette GitHub adaptée au thème sombre du projet — pas de couleur en dur dans le JSX.

### Overlay (`InputMarkdownOverlay.tsx`)
- Étendre `parseLines` pour reconnaître `> [!TYPE]` comme un nouveau line type `alertHeader`, rendu coloré (couleur de l'alerte, marker `[!TYPE]` visible à ~55 %).
- Les lignes `>` qui suivent gardent le style `blockquote`. Pas de bloc visuel multi-ligne dans l'overlay (impossible sans casser l'alignement caret) — seul l'entête de la première ligne se colore. Le rendu complet apparaît côté message envoyé.

### Fallbacks
- `> [!XYZ]` non reconnu → rendu blockquote standard (compat avant).
- Alerte vide (`> [!NOTE]` sans contenu) → bloc rendu avec entête seul.

---

## Validation

- `bunx tsc --noEmit`.
- Aperçu visuel desktop + mobile :
  - Topic Markdown affiché correctement dans chaque type de salon (vocal, annonce, forum, média, calendrier, tâches, stage, lien, mobile sheet).
  - Composer overlay actif lors de l'édition d'un message (chat/DM/thread/vocal/annonce), composer d'annonce, composer média et édition de topic — markers gris faibles + rendu WYSIWYG.
  - Coller le bloc des 5 alertes (cf. message utilisateur) dans un message : rendu identique à l'image, couleurs/icônes correctes, marker `[!TYPE]` visible mais discret dans le composer.

## Hors scope

- Pas de Markdown sur la description de serveur (à confirmer séparément).
- Pas de migration des bios (`parseMarkdown` legacy → `<MarkdownText>`) — déjà fonctionnel.
- Pas de support des alertes imbriquées dans des listes.