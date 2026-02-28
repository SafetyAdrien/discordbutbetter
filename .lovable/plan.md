

# Implementer le Markdown dans le chat vocal

## Changement

Remplacer l'affichage brut du contenu des messages (`{message.content}`) par le composant `MarkdownText` deja utilise dans `ChatArea`, pour que les messages dans le chat des salons vocaux et stage beneficient du meme rendu Markdown (gras, italique, titres, code blocks, mentions, etc.).

## Fichier a modifier

### `src/components/channels/voice/VoiceChannelChat.tsx`

1. **Ajouter l'import** de `MarkdownText` depuis `@/lib/markdown` (en haut du fichier)

2. **Ligne 299-304** : Remplacer le `<p>` contenant `{message.content}` par un rendu via `MarkdownText` :

```tsx
// Avant
<p className="text-sm text-foreground/90 break-words">
  {message.content}
  {message.edited_at && (
    <span className="text-[10px] text-muted-foreground ml-1">(modifie)</span>
  )}
</p>

// Apres
<div className="text-sm text-foreground/90 break-words">
  <MarkdownText content={message.content} />
  {message.edited_at && (
    <span className="text-[10px] text-muted-foreground ml-1">(modifie)</span>
  )}
</div>
```

Le composant `MarkdownText` gere deja le rendu complet : gras, italique, souligne, barre, code inline, code blocks, titres, listes, blockquotes, mentions, spoilers et liens masques.

## Resultat

Les messages dans le chat textuel des salons vocaux et stage afficheront le Markdown de maniere identique aux salons textuels classiques.

