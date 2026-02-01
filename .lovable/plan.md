
## Changement de couleur primaire des boutons

### Objectif
- Changer la couleur primaire de `#2153ed` (bleu) 
- Au hover, la teinte sera légèrement plus claire, sans animation

### Conversion couleur
`#2153ed` → HSL : **225 85% 53%**

---

## Fichiers à modifier

### 1. `src/index.css` - Variable CSS primaire

**Ligne 122** : Changer la variable `--primary`

```css
/* AVANT */
--primary: 186 100% 50%;

/* APRÈS */
--primary: 225 85% 53%;
```

**Lignes concernées également** (pour cohérence) :
- Ligne 142 `--ring` → `225 85% 53%`
- Ligne 147 `--glow-primary` → `225 85% 53%`
- Ligne 171 `--sidebar-primary` → `225 85% 53%`
- Ligne 176 `--sidebar-ring` → `225 85% 53%`

---

### 2. `src/components/ui/button.tsx` - Supprimer animations hover

**Variante `default`** (lignes 11-12) :

```typescript
// AVANT
default:
  "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]",

// APRÈS - hover plus clair sans animation
default:
  "bg-primary text-primary-foreground hover:bg-primary/85",
```

**Variante `gaming`** (lignes 20-21) :

```typescript
// AVANT
gaming:
  "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]",

// APRÈS
gaming:
  "bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:from-primary/85 hover:to-secondary/85",
```

**Variante `glow`** (lignes 22-23) :

```typescript
// AVANT
glow:
  "bg-primary/20 text-primary border border-primary/50 hover:bg-primary/30 hover:shadow-lg hover:shadow-primary/30",

// APRÈS
glow:
  "bg-primary/20 text-primary border border-primary/50 hover:bg-primary/35",
```

---

## Résumé des changements

| Fichier | Modification |
|---------|--------------|
| `src/index.css` | Variable `--primary` et associées → `225 85% 53%` |
| `src/components/ui/button.tsx` | Retirer `shadow-*`, `hover:scale-*`, `active:scale-*` et utiliser `hover:bg-primary/85` pour un effet plus clair |

---

## Résultat attendu
- Boutons avec couleur `#2153ed` (bleu)
- Au survol : couleur légèrement plus claire (via opacité 85%)
- Aucune animation de scale ou shadow
