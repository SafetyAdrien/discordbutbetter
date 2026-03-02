

# Corriger les scrollbars de la liste de serveurs

## Problemes identifies

1. **Mobile** : La scrollbar dans la colonne de serveurs (`MobileServersView.tsx`) est trop visible et epaisse
2. **Desktop** : La liste de serveurs (`ServerList.tsx`) a un `overflow-x-visible` qui genere une scrollbar horizontale inutile

## Changements

### 1. `src/index.css` - Reduire l'opacite de la scrollbar a 20%

Modifier la classe `.scrollbar-thin` pour appliquer une opacite de 20% sur le thumb :
- Remplacer `background: hsl(var(--muted))` par `background: hsl(var(--muted) / 0.2)` sur le thumb
- Ajuster le hover a `hsl(var(--muted-foreground) / 0.3)` pour rester subtil

### 2. `src/components/layout/ServerList.tsx` - Supprimer la scrollbar horizontale

Ligne 459 : remplacer `overflow-x-visible` par `overflow-x-hidden` pour eliminer la scrollbar horizontale inutile sur desktop.

