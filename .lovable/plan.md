

# Corriger le centrage vertical du textarea (Desktop) -- Cause racine identifiee

## Probleme

Le texte et le placeholder apparaissent trop haut dans la barre de saisie sur Desktop.

## Cause racine

Dans `MessageInput.tsx` (ligne 484), le textarea a les classes suivantes :

```text
p-0 ... py-2.5 text-sm pr-1 min-h-[40px]
```

Le probleme est un **conflit Tailwind entre `p-0` et `py-2.5`**. `p-0` genere `padding: 0px` (shorthand CSS), tandis que `py-2.5` genere `padding-top: 0.625rem; padding-bottom: 0.625rem` (longhand CSS). Selon l'ordre de generation des utilitaires dans le fichier CSS compile par Tailwind, **`p-0` peut ecraser `py-2.5`**, ce qui met le padding vertical a 0px. Le texte se retrouve alors colle en haut du conteneur de 40px.

## Solution

Remplacer `p-0` par `px-0` dans les classes du textarea. Ainsi, seul le padding horizontal est mis a zero, et `py-2.5` s'applique correctement sans conflit.

## Changements

### Fichier : `src/components/chat/MessageInput.tsx` (ligne 484)

Remplacer :
```
p-0 shadow-none
```
Par :
```
px-0 shadow-none
```

Aucun autre fichier a modifier -- le `InputMarkdownOverlay` utilise deja `py-2.5` sans `p-0`, donc il est deja correct.

| Fichier | Changement |
|---------|-----------|
| `src/components/chat/MessageInput.tsx` | `p-0` -> `px-0` pour supprimer le conflit Tailwind |

## Verification

Apres ce changement, le padding vertical de 10px (py-2.5) sera effectif. Avec une line-height de 20px, le texte sera centre dans le conteneur de 40px (10 + 20 + 10 = 40).

