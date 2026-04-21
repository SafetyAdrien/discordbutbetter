

# Refonte du système de réponse — Style natif (Discord/Telegram)

Aligner visuellement le système de réponse sur le standard montré dans la capture d'écran : afficher la réponse comme une **petite ligne distincte au-dessus du message**, avec un connecteur courbe (┌─), un mini-avatar, le pseudo de l'auteur cité et un résumé tronqué — au lieu du blockquote markdown actuel.

## Ce que l'utilisateur verra

### Avant
La réponse est affichée comme une citation markdown (`> **Adrien_Sama:** Message…`) noyée dans le contenu, occupant plusieurs lignes et brisant la lisibilité.

### Après
Au-dessus de chaque message-réponse :

```text
  ┌─ 🟣 Adrien_Sama  Message de réponse…
🟣 Adrien_Sama  •  8:54
   Message répondue.
```

**Composants visuels du `replied-line`** :
- **Connecteur en L arrondi** (`┌─`) en SVG : trait fin (1.5px), couleur `border`, partant du centre de l'avatar du message principal jusqu'à la ligne de réponse
- **Mini-avatar** (16×16, rounded-full) de l'auteur cité, aligné sur l'indentation de l'avatar principal
- **Pseudo cliquable** de l'auteur cité (couleur du rôle si applicable, sinon `text-foreground/80`, semibold, taille 13px)
- **Aperçu du contenu** :
  - Texte simple, taille 13px, couleur `text-muted-foreground`
  - Markdown des mentions, emojis, et formatage **désactivé** (texte brut nettoyé) sauf rendu inline ultra-léger des mentions `<@user>` → `@pseudo`
  - **Tronqué à 64 caractères max** sans ellipsis trois-points : coupe nette + fade-out CSS via `mask-image: linear-gradient(to right, black 90%, transparent)` (effet identique à la liste des membres pour les noms de salons)
  - Tooltip au survol révélant le contenu complet
- **Indicateur de média** si le message cité contient une pièce jointe : icône 📎 + libellé "Pièce jointe" / "Image" / "Vidéo" en italique
- **Tap/clic** sur la ligne → scroll vers le message original avec highlight pulsant 1.5s (réutilise le mécanisme existant `messageRefs`)
- **Message supprimé** : affichage "Message original supprimé" en italique, mini-avatar en placeholder gris, pas cliquable

**Préservé** :
- Le `ReplyReference` (preview au-dessus de l'input avant envoi) — déjà visuellement correct, ajustement mineur de cohérence
- Le `SwipeToReplyRow`, le menu contextuel, et tout le flux de déclenchement de réponse

### Cas couverts
- **Premier d'une rafale** (avec avatar) : connecteur ancré au centre de l'avatar
- **Message groupé** (sans avatar) : connecteur ancré sur la marge gauche, à la même indentation
- **Réponse à un message avec pièce jointe sans texte** : "📎 Image" / "📎 2 pièces jointes"
- **Réponse à un sondage** : "📊 Question du sondage…"
- **Réponse à un message de soi-même** : pseudo en couleur primaire (Adrien_Sama bleu dans la capture)

### Cohérence multi-plateformes
- **Desktop** (`ChatArea`) : indentation 50px (alignée sur l'avatar 40px + gap 12px)
- **Mobile** (`MobileChatView` / `ChatArea` mobile) : même indentation, taille tactile ≥ 32px sur la zone cliquable
- **Threads** (`ThreadView`) : même rendu, mais dans threads le système de citation "simulé" déjà existant (cf. memory `mem://features/threads/reply-logic-simulated`) **reste inchangé** — la nouvelle UI s'applique uniquement aux salons textuels classiques

## Détails techniques

### Stockage de la réponse — sans nouvelle colonne DB
Le format markdown actuel (`> **Author:** content…\n\n{body}`) est conservé en base, mais désormais **parsé côté client** pour extraire les métadonnées et rendre le composant `RepliedLine` au lieu du blockquote standard.

**Pattern de détection** (regex) :
```
^> \*\*(?<authorName>[^:*]+):\*\* (?<preview>.+?)(?:\.\.\.)?\n\n(?<body>[\s\S]+)$
```

Si le pattern match en première position du contenu :
1. Extraire `authorName`, `preview`, `body`
2. Rendre `<RepliedLine author={authorName} preview={preview} onJump={…} />`
3. Rendre `<MarkdownText content={body} />` à la place du contenu complet

Si pas de match → comportement actuel (blockquote markdown standard pour les vraies citations utilisateur).

**Limitation acceptée** : on ne peut pas (sans nouvelle colonne) récupérer l'avatar exact ni l'ID du message cité. Mitigations :
- Avatar : recherché via `memberRoles`/profils chargés en mémoire en matchant `displayName` (best-effort, fallback sur initiale)
- Jump-to-message : recherche dans la liste des messages chargés par contenu+auteur (best-effort, sinon ligne non cliquable avec tooltip "Message hors de portée")

**Évolution future propre (non incluse mais préparée)** : ajouter `reply_to_id uuid REFERENCES messages(id)` pour un lien fort. Le composant `RepliedLine` est déjà conçu pour accepter directement un `repliedMessage: Message` en prop (résolution exacte avatar + jump fiable).

### Fichiers créés
- `src/components/chat/RepliedLine.tsx` — composant ligne de réponse :
  - Props : `authorName`, `preview`, `repliedMessage?` (optionnel pour résolution future), `onJump?`
  - Connecteur SVG `┌─` (path : `M 20 24 Q 20 12 32 12`)
  - Truncation : `maxLength = 64`, fade-out via `mask-image`
  - Mini-avatar via lookup dans le contexte markdown
- `src/lib/parse-reply.ts` — utilitaire pur :
  - `parseRepliedMessage(content: string): { reply: { author: string; preview: string } | null; body: string }`
  - Regex unique, return safe si pas de match

### Fichiers modifiés
- `src/components/chat/ChatArea.tsx` :
  - Importer `parseRepliedMessage` + `RepliedLine`
  - Dans le rendu message (showAuthor `true` ET `false`), avant la `<p>` de contenu, parser et afficher `<RepliedLine />` si applicable
  - Passer `body` au lieu de `message.content` à `MarkdownText`
  - Ajustement : nettoyer le format envoyé à `onSendMessage` pour limiter le preview à **80 caractères** (au lieu de 100) afin de garantir un rendu propre — **non bloquant**, le composant tronque à 64
- `src/components/chat/ChatArea.tsx` — `ReplyReference` (preview input) :
  - Ajouter le mini-connecteur `┌─` pour cohérence visuelle avec la version affichée
  - Truncation harmonisée à 64 caractères avec fade-out
- `src/components/dm/DMConversation.tsx` (et version mobile) :
  - Même intégration de `RepliedLine` pour les DMs (même format markdown sous-jacent)
- `src/components/threads/ThreadView.tsx` :
  - **Inchangé** (cf. memory `reply-logic-simulated`)

### Truncation "style liste membres"
Réutilise le pattern utilisé pour les noms de salons dans `MemberList` : pas de `text-overflow: ellipsis` (pas de `…`), mais un masque CSS qui fait disparaître les derniers caractères en fondu :

```css
mask-image: linear-gradient(to right, black calc(100% - 24px), transparent);
```

Combiné à `overflow: hidden` + `white-space: nowrap` + `max-width` calculé. Largeur cible : `min(64ch, 380px)` desktop, `min(48ch, 70vw)` mobile.

### Performance
- Parsing regex O(n) sur le contenu, exécuté une seule fois au render (mémoïsable via `useMemo` si profilage le suggère)
- Pas de requête supplémentaire ; tout résolu depuis les données déjà en cache (`memberRoles`, `messages`)
- Pas d'impact sur les hooks existants (`useMessages`, `usePinnedMessages`, `useDMMessages`)

### Accessibilité
- `aria-label="Réponse à {auteur}: {preview}"` sur la ligne
- Bouton clavier-focusable, Enter = jump
- Contraste AA sur le texte tronqué (`text-muted-foreground` ≈ 4.6:1)
- Connecteur SVG marqué `aria-hidden`

**Aucune migration DB requise.**

