

# Distinction ServerList / ChannelList + Catégories sans majuscules

## Problème
Les deux panneaux (ServerList et ChannelList) partagent le même fond `surface-1` — ils se confondent visuellement. Les noms de catégories sont forcés en `uppercase`.

## Changements

### 1. `src/components/layout/ServerList.tsx`
- Changer le fond de `bg-surface-1` vers un fond plus sombre basé sur `--sidebar-background` (6% lightness) pour creuser l'écart avec le ChannelList (8%)
- Ajouter une bordure droite subtile `border-r border-border/30` pour marquer la séparation

### 2. `src/components/layout/ChannelList.tsx`
- Garder `bg-surface-1` (8% lightness) — le contraste avec le ServerList plus sombre suffit
- **Catégories** : retirer `uppercase` de la classe des noms de catégories (ligne ~300 et ~1714)

### 3. `src/index.css`
- Ajuster `--surface-1` légèrement vers 9-10% pour augmenter l'écart avec le sidebar (6%) et le background (11%)
- Ou créer un token dédié `--surface-server-list` si l'écart n'est pas suffisant

### 4. `src/pages/Index.tsx`
- Pas de changement structurel nécessaire, le `gap-[2px]` existant aide déjà

## Résultat attendu
- ServerList nettement plus sombre que ChannelList
- Catégories affichées en casse normale (première lettre majuscule naturelle)

