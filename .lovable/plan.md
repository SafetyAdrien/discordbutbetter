

# Corrections sur les serveurs

## Changements

**`src/components/layout/ServerList.tsx`** — Restaurer l'animation des pills :
- Ligne 127 : remettre `transition: 'height 300ms'`
- Ligne 462 : supprimer le `style={{ transition: 'none' }}`
- Ligne 469 : remettre `transition: 'height 300ms'`

**`src/index.css`** — Supprimer le changement de forme carré :
- Supprimer les blocs `.server-icon:hover` et `.server-icon.active` (lignes 302-308) qui appliquent `border-radius: var(--radius-xl)`
- L'icône restera toujours ronde (`rounded-full`)

