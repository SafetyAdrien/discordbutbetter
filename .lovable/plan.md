

# Markdown dans l'input et separateurs pour titres

## Deux changements demandes

### 1. Apercu Markdown en direct dans l'input

Actuellement, l'input est un `<textarea>` HTML standard qui ne peut pas afficher du texte formate. Pour afficher les titres directement dans l'input, il faut remplacer le textarea par un systeme a deux couches (overlay) :

- Une couche d'arriere-plan qui affiche le contenu rendu (titres en gros, sous-titres en petit, etc.)
- Un `<textarea>` transparent par-dessus pour capturer la saisie

Ce systeme est utilise par Discord : le texte brut est invisible mais positionne exactement, et le rendu visuel est affiche en dessous.

**Fichier** : `src/components/chat/MessageInput.tsx`
- Remplacer le textarea simple par un conteneur avec overlay
- Ajouter un composant `InputMarkdownOverlay` qui parse le contenu en temps reel et affiche les titres avec leur taille appropriee
- Le textarea reste transparent pour la saisie, le curseur et la selection
- Supprimer le bouton d'apercu separe (Eye/EyeOff) et le composant `MarkdownPreview` puisque l'apercu est maintenant integre

**Nouveau fichier** : `src/components/chat/InputMarkdownOverlay.tsx`
- Composant qui recoit le texte brut et affiche le rendu des headers uniquement (pas bold/italic qui changerait la largeur du texte)
- Les lignes commencant par `#` sont affichees en grande taille
- Les lignes commencant par `-#` sont affichees en petite taille
- Le reste du texte est affiche normalement pour garder l'alignement avec le textarea

### 2. Separateurs pour titres et sous-titres dans les messages envoyes

**Fichier** : `src/lib/markdown.tsx` (fonction `renderBlockToken`)

- **Titres (`#`, `##`, `###`)** : Ajouter un `<hr>` / separateur en dessous de chaque titre
- **Sous-titre (`-#`)** : Ajouter un separateur au-dessus du sous-titre

Les separateurs seront des lignes fines avec la couleur `border` existante.

---

## Details techniques

### InputMarkdownOverlay

```text
+------------------------------------------+
|  [Overlay div - texte rendu visible]     |
|    # Titre  -> affiche en text-2xl       |
|    texte    -> affiche en text-sm        |
+------------------------------------------+
|  [Textarea transparent par-dessus]       |
|    meme contenu, meme font, invisible    |
+------------------------------------------+
```

Le textarea et l'overlay partagent exactement les memes proprietes CSS (font, padding, line-height) pour que le texte se superpose parfaitement. Le textarea a `color: transparent` et `caret-color: white` pour que seul le curseur soit visible.

### Separateurs dans renderBlockToken

Pour les headers :
```text
# Mon titre
─────────────  (separateur en dessous)
```

Pour les sous-titres :
```text
─────────────  (separateur au-dessus)
-# Mon sous-titre
```

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/chat/InputMarkdownOverlay.tsx` | Nouveau composant overlay pour rendu en direct |
| `src/components/chat/MessageInput.tsx` | Integrer l'overlay, rendre le textarea transparent, supprimer le bouton apercu |
| `src/lib/markdown.tsx` | Ajouter separateurs aux headers et sous-titres |

