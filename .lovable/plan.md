

## Objectif

Simplifier l'apparence des pastilles de mention dans le chat :
- **Rôles** : retirer la bordure gauche colorée et le fond teinté → afficher uniquement le **texte en bleu Discord** (`#5865F2`)
- **`@everyone` / `@here`** : retirer la bordure gauche jaune et le fond jaune → afficher uniquement le **texte en bleu Discord**

Seul le surlignage **du message entier** (bordure gauche jaune + fond jaune) reste actif lorsque l'utilisateur est concerné par la mention. C'est désormais le **seul indicateur de "ça me concerne"**.

## Comportement final

| Élément | Avant | Après |
|---|---|---|
| `@NomDuRôle` (pastille) | Fond coloré + bordure gauche couleur du rôle | Texte bleu `#5865F2`, sans fond, sans bordure |
| `@everyone` (pastille) | Fond jaune + bordure gauche jaune | Texte bleu `#5865F2`, sans fond, sans bordure |
| `@here` (pastille) | Fond jaune + bordure gauche jaune | Texte bleu `#5865F2`, sans fond, sans bordure |
| Bordure gauche du **message** mentionné | Jaune (déjà en place) | Inchangé |
| Fond jaune translucide du **message** mentionné | ~10 % opacité (déjà en place) | Inchangé |

`@MonNom` (self-mention utilisateur) reste **inchangé** (jaune avec bordure et fond) — c'est la convention Discord pour distinguer les mentions directes vous concernant des mentions globales/rôle.

## Modifications

### `src/components/chat/mentions/MentionComponents.tsx`

**1. `RoleMention`** (lignes 86-115)

Remplacer le bloc `<span>` actuel par :

```tsx
<span
  className="inline-flex items-center px-1 rounded-[3px] cursor-default font-medium transition-colors duration-100"
  style={{ color: '#5865F2' }}
>
  @{roleName}
</span>
```

Retraits :
- `border-l-2`
- `borderLeftColor` inline
- `backgroundColor: hexToRgba(roleColor, 0.3)` inline
- `pl-1.5 pr-1` (compensation de la bordure) → remplacé par `px-1` symétrique

L'helper `hexToRgba` n'est plus utilisé dans `RoleMention` mais reste exporté si réutilisé ailleurs (à laisser en place, sans risque). La prop `roleColor` reste acceptée mais n'est utilisée que dans le **tooltip** (pour la pastille de couleur du rôle dans le popup hover).

**2. `EveryoneMention`** (lignes 232-239)

Remplacer par :

```tsx
export function EveryoneMention({ type }: EveryoneMentionProps) {
  return (
    <span
      className="inline-flex items-center px-1 rounded-[3px] font-medium"
      style={{ color: '#5865F2' }}
    >
      @{type}
    </span>
  );
}
```

Retraits :
- `bg-[rgba(250,166,26,0.3)]`
- `text-[#faa61a]`
- `border-l-2 border-[#faa61a]`

## Détails techniques

- Couleur retenue : `#5865F2` — bleu Discord standard (déjà utilisé pour les `UserMention` non-self dans la variante `bio` du même fichier, cohérence garantie).
- Aucun changement sur :
  - `UserMention` (mentions utilisateurs : self reste jaune, autres restent violet/bleu pâle Discord)
  - `ChannelMention`, `SpecialMention`, `MessageLinkEmbed`
  - La détection `messageMentionsMe` et la classe `.message-mentioned` (le surlignage du message entier reste l'indicateur principal)
  - Le moteur Markdown (`src/lib/markdown.tsx`)
  - Le wire format `<@&SNOWFLAKE>` / `@everyone` / `@here`
- L'autocomplétion (dropdown) garde son style propre (non touché).
- Tooltip de `RoleMention` conservé tel quel (affiche toujours la couleur réelle du rôle dans la pastille du popup).

## Garantie de non-régression

- Aucune migration SQL
- Aucune perte de fonctionnalité (clic, hover tooltip, etc.)
- Aucun impact sur les notifications, permissions, popup d'avertissement `@everyone`
- Le contraste sur fond sombre reste lisible (`#5865F2` testé Discord-natif sur `--background`)
- Les messages **mentionnant l'utilisateur** restent identifiables via la bordure gauche jaune + fond jaune translucide du message lui-même

## Fichiers modifiés

- `src/components/chat/mentions/MentionComponents.tsx` — `RoleMention` et `EveryoneMention` simplifiés (texte bleu uniquement)

