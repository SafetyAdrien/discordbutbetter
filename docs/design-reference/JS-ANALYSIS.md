# Rétro-ingénierie des 356 bundles JS

> Corpus : 356 bundles, 16,3 Mo. `web.js` à lui seul pèse 11,8 Mo (73 %).
> Minifié et non obfusqué côté identifiants : les noms de composants,
> les constantes de mise en page et les chaînes de tracking restent lisibles.

## 1. Structure du corpus

| Fichier | Taille | Rôle |
|---|---|---|
| `web.3a122a9dc6c39305.js` | 11,8 Mo | toute l'application |
| `221098…js` | 1,2 Mo | itchunker |
| `vnd-emoji…js` | 1,1 Mo | jeu d'emojis |
| `192743…js` | 682 Ko | itchunker |
| `556707…js` | 328 Ko | itchunker |
| 336 autres | < 10 Ko chacun | 0,3 Mo au total |

Webpack à IDs numériques : `{492313(e,t,n){…}}`. Aucun sourcemap publié.

## 2. Architecture de redimensionnement

Trouvé dans le bundle principal — c'est la source de vérité, pas le CSS.

```js
E = resize({
  minDimension: 264,
  maxDimension: 432,
  resizableDomNodeRef: d,
  orientation: HORIZONTAL_RIGHT,
  throttleDuration: 0
})
```

Et le handler clavier :

```js
case "Home": t = 264; break;
case "End":  t = 432; break;
let n = Math.min(Math.max(t, 264), 432);
```

**La liste de salons est redimensionnable de 264 à 432 px.** Les 268 px
de `--custom-guild-sidebar-width` ne sont que la **valeur par défaut**.

→ Correction de `ARCHITECTURE.md`, qui présentait 268 px comme une constante.

## 3. Taxonomie des éléments de chat

Discord ne rend pas « une liste de messages » mais un flux d'éléments typés :

```
MESSAGE
MESSAGE_GROUP
MESSAGE_GROUP_BLOCKED
MESSAGE_GROUP_IGNORED
MESSAGE_GROUP_SPAMMER
MESSAGE_GROUP_SUSPENDED_USER
THREAD_STARTER_MESSAGE
DIVIDER
DIVIDER_TIME_STAMP
DIVIDER_NEW_MESSAGES
JUMP_TARGET
FORUM_POST_ACTION_BAR
```

Deux conséquences de conception :

- Le **separateur de date** est un élément de flux à part entière
  (`DIVIDER`), pas un décor posé par-dessus.
- `JUMP_TARGET` et `DIVIDER_NEW_MESSAGES` signifient que le saut au
  dernier message est un élément du flux, pas un bouton flottant.

## 4. Props d'un message

Extraites de la fonction de rendu :

```js
function E(e) {
  let { groupStart = false, compact = false,
        attachmentSpecs, usernameWidth, usernameOpacity,
        className, style } = e;
  if (!compact && groupStart) { /* avatar + nom + horodatage */ }
}
```

Donc un message porte : `groupStart` (début de groupe) et `compact`
(message fusionné avec le précédent). C'est exactement la mécanique qui
manquait au projet.

## 5. Noms de composants identifiés

9 460 chaînes distinctes, dont **222 clés de composants** lisibles :

```
ChannelTextAreaContainer    ChannelTextAreaButtons    ChannelTabBar
ChannelRenderer             ChannelReader             ChannelMessages
GuildSidebar                GuildHeaderPopout         GuildRole
ChannelSectionStore         ChannelMemberCountStore   ChannelPinsStore
GuildMemberStore            GuildCategoryStore        GuildChannelStore
```

et les identifiants de sections d'interface (tracking) :

```
GUILD_LIST · CHANNEL_LIST · MEMBER_LIST · CHANNEL_HEADER
ACCOUNT_PANEL · ACTIVITY_PANEL · THREAD_MEMBER_LIST · GUILD_HEADER
```

## 6. Espacements mesurés

```js
{ direction:"horizontal", wrap:!0, gap:8, style:{ marginTop:16 } }
```

Écart de 8 px, marge haute de 16 px sur les rangées d'outils.
`gap:8` + `marginTop:16` est le motif récurrent des barres d'outils.

## 7. Ce que le JS corrige du CSS

| Élément | CSS seul | JS (mesuré) |
|---|---|---|
| Largeur liste de salons | 268 px (semble fixe) | **264–432 px, défaut 268** |
| Repli des messages | invisible | props `groupStart` / `compact` |
| Séparateur de date | simple style | **élément de flux typé** |
| Saut au dernier message | absent du CSS | **élément `JUMP_TARGET`** |

## 8. Limites de cette analyse

- Les noms de variables locales sont mangés : je n'ai pu nommer les
  constantes que par leur contexte d'appel, pas par leur identifiant.
- Aucune logique de rendu n'a été déminifiée — j'ai，什么时候 mining les
  chaînes et les littéraux, pas restructuré le code.
- La contradiction `--background-base-lower` (chat **et** liste de salons)
  reste ouverte : elle ne se tranche ni dans le CSS ni dans le JS.

## Suite

1. Trancher la contradiction des surfaces — c'est le seul point bloquant
   pour figer la palette des surfaces.
2. Déminifier les modules de rendu de `ChannelTextArea*` et du flux de
   messages pour extraire l'anatomie complète (groupement, pièces
   jointes, réactions).
3. Vérifier les 264 → 432 px sur la colonne membres, qui n'a pas produit
   de constante équivalente côté JS.