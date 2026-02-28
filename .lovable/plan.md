

# Correction du support Unicode/emojis dans les noms de salons

## Probleme

La fonction `formatStrictChannelName` utilise un regex trop restrictif qui n'autorise que les caracteres latins basiques (`a-z0-9`) et etendus (`\u00C0-\u024F`). Les emojis, caracteres CJK, separateurs Unicode (comme `・`), et autres symboles sont supprimes.

## Solution

Modifier la regex dans `formatStrictChannelName` pour utiliser les classes Unicode de JavaScript (`\p{L}` pour les lettres, `\p{N}` pour les chiffres, `\p{Emoji}` pour les emojis, `\p{So}` pour les symboles). Cela permet d'accepter tous les caracteres "significatifs" tout en supprimant uniquement les caracteres de controle et les caracteres non imprimables.

## Fichiers a modifier

### 1. `src/components/channel-settings/ChannelOverview.tsx` (ligne 20-25)

Remplacer le regex dans `formatStrictChannelName` :
- Ancien : `[^a-z0-9\u00C0-\u024F-_]`
- Nouveau : utiliser un regex Unicode-aware avec le flag `u` qui conserve les lettres (`\p{L}`), chiffres (`\p{N}`), emojis, tirets, underscores, et les separateurs courants comme `・`

La fonction deviendra :
```
function formatStrictChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}\p{Emoji_Presentation}\p{So}・\-_]/gu, '');
}
```

### 2. `src/components/modals/CreateChannelModal.tsx` (ligne 18-23)

Meme modification exacte de la fonction `formatStrictChannelName` dupliquee dans ce fichier.

## Ce qui ne change pas

- Le mode "flexible" (aucun formatage applique)
- L'exemption pour les salons voice/stage
- La logique de sauvegarde et de detection de changements
- Tout le reste de l'interface

