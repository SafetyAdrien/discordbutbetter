## Objectif

Sur Desktop, la pastille blanche à gauche des icônes de serveurs (`ServerList.tsx`) possède un style et un comportement spécifiques :

- Position : `absolute -left-[14px]`
- Largeur : `w-[4px]`
- Coin droit arrondi : `rounded-r-full`
- Couleur : `bg-foreground`
- Hauteur dynamique :
  - Serveur actif → `h-10`
  - Non-lu / mentions → `h-2`
  - Sinon → `h-0` puis `group-hover:h-5` (croissance au survol)
- Transition : `height 300ms`

Sur Mobile (`MobileServersView.tsx`), la pastille est légèrement différente :
- `-left-[11px]`, `w-1`, centrée verticalement avec `top-1/2 -translate-y-1/2`
- Hauteurs `h-8 / h-3 / h-0 opacity-0`, sans état hover, transition `transition-all`

L'utilisateur veut que la version mobile soit **entièrement identique** au desktop, à la fois sur le style et le comportement.

## Modifications

### 1. `src/components/mobile/MobileServersView.tsx` — icône de serveur (lignes 101-104)

Remplacer le `<div>` de la pastille par la version desktop :

```tsx
<div
  className={cn(
    'absolute -left-[14px] w-[4px] rounded-r-full bg-foreground',
    isActive
      ? 'h-10'
      : hasUnread || mentionCount > 0
        ? 'h-2'
        : 'h-0 group-hover:h-5'
  )}
  style={{ transition: 'height 300ms' }}
/>
```

Le bouton parent porte déjà la classe `group`, donc `group-hover:h-5` fonctionnera (même si peu visible sur tactile, c'est conservé pour parité 1:1 avec le desktop, notamment sur tablette ou en mode souris).

### 2. `src/components/mobile/MobileServersView.tsx` — bouton DM (lignes 302-305)

Appliquer exactement le même bloc, en remplaçant `hasUnread` par `totalUnreadDMs > 0` et en gardant `showDMs` pour l'état actif :

```tsx
<div
  className={cn(
    'absolute -left-[14px] w-[4px] rounded-r-full bg-foreground',
    showDMs
      ? 'h-10'
      : totalUnreadDMs > 0
        ? 'h-2'
        : 'h-0 group-hover:h-5'
  )}
  style={{ transition: 'height 300ms' }}
/>
```

Ajouter la classe `group` au bouton DM si elle est absente, pour que `group-hover` fonctionne.

## Vérification

- `bunx tsc --noEmit`
- Vérification visuelle mobile : la pastille apparaît à `-14px` à gauche, largeur 4px, hauteur 40px en actif, 8px quand il y a un non-lu, et anime sur 300ms — identique au desktop.

## Hors-périmètre

- Les badges de mentions rouges et les badges vocaux ne sont pas modifiés.
- Aucune modification de logique métier (calcul des non-lus, sélection de serveur).
