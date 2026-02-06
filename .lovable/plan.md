

# Thème Gris Bleuté - Amélioration de l'Interface

## Objectif
Transformer la palette de couleurs de l'application vers une teinte gris bleuté plus moderne et cohérente, similaire aux dernières versions de Discord mais avec une identité visuelle distincte.

---

## Analyse du thème actuel

### Valeurs HSL actuelles (Hue autour de 220-233°)
| Variable | Valeur actuelle | Commentaire |
|----------|-----------------|-------------|
| `--background` | `231 24% 13%` | Légèrement violet-bleu |
| `--card` | `233 27% 11%` | Violet-bleu foncé |
| `--popover` | `231 24% 11%` | Similaire au background |
| `--muted` | `231 20% 18%` | Gris-violet |
| `--sidebar-background` | `233 30% 8%` | Très foncé |
| `--input` | `231 23% 17%` | Gris-violet |

Le thème actuel utilise une teinte autour de **231-233°** (violet-bleu). Pour un gris bleuté plus "Discord moderne", nous devons :
1. Ramener la teinte vers **220-225°** (bleu pur)
2. Réduire légèrement la saturation pour un rendu plus neutre
3. Ajuster les luminosités pour un meilleur contraste

---

## Nouvelle palette proposée

### Comparaison visuelle

```text
Actuel (Violet-bleu ~231°)     →    Nouveau (Gris-bleuté ~218°)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#191C2B (Background)           →    #1A1D24 (Plus gris, moins violet)
#151724 (Card/Sidebar)         →    #14171C (Gris ardoise profond)
#10121B (Server Rail)          →    #111316 (Presque noir bleuté)
#2B3250 (Toolbar)              →    #252A35 (Gris-bleu moyen)
```

### Nouvelles valeurs HSL

| Variable | Ancienne valeur | Nouvelle valeur | Description |
|----------|-----------------|-----------------|-------------|
| `--background` | `231 24% 13%` | `218 18% 12%` | Chat principal - gris bleuté |
| `--foreground` | `220 6% 86%` | `218 10% 90%` | Texte plus lumineux |
| `--card` | `233 27% 11%` | `218 20% 10%` | Sidebar canaux |
| `--popover` | `231 24% 11%` | `218 22% 9%` | Menus contextuels |
| `--toolbar` | `229 30% 24%` | `218 20% 18%` | Barre d'outils |
| `--muted` | `231 20% 18%` | `218 15% 20%` | Surfaces secondaires |
| `--muted-foreground` | `216 7% 73%` | `218 12% 70%` | Texte secondaire |
| `--border` | `231 20% 18%` | `218 15% 18%` | Bordures subtiles |
| `--input` | `231 23% 17%` | `218 18% 15%` | Champs de saisie |
| `--surface-elevated` | `231 24% 15%` | `218 18% 14%` | Surfaces élevées |
| `--surface-hover` | `231 24% 20%` | `218 18% 22%` | État hover |
| `--sidebar-background` | `233 30% 8%` | `218 25% 7%` | Rail des serveurs |
| `--sidebar-accent` | `231 24% 18%` | `218 18% 20%` | Accent sidebar |
| `--sidebar-border` | `231 20% 18%` | `218 15% 16%` | Bordure sidebar |
| `--user-panel` | `230 28% 10%` | `218 22% 9%` | Panneau utilisateur |
| `--poll-background` | `231 24% 11%` | `218 20% 10%` | Fond des sondages |

---

## Résultat visuel attendu

### Avant (Violet-bleu)
```text
┌─────────────────────────────────────────┐
│ #10121B │ #151724 │ #191C2B │ #2B3250  │
│ (Rail)  │ (Sidebar)│ (Chat)  │ (Toolbar)│
└─────────────────────────────────────────┘
Teinte dominante : Violet-bleu profond
```

### Après (Gris-bleuté)
```text
┌─────────────────────────────────────────┐
│ #111316 │ #14171C │ #1A1D24 │ #252A35  │
│ (Rail)  │ (Sidebar)│ (Chat)  │ (Toolbar)│
└─────────────────────────────────────────┘
Teinte dominante : Gris ardoise bleuté (moderne)
```

---

## Fichier à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/index.css` | Mettre à jour toutes les variables CSS `:root` avec les nouvelles valeurs HSL |

---

## Détail des modifications dans index.css

### Section `:root` (lignes 104-180)

```css
:root {
  /* Dark Space Theme - Gris Bleuté Moderne */
  
  /* Main Chat + Member List */
  --background: 218 18% 12%;
  /* Primary text - légèrement plus lumineux */
  --foreground: 218 10% 90%;

  /* Sidebar Channels */
  --card: 218 20% 10%;
  --card-foreground: 218 10% 90%;

  /* Popovers/Menus - plus sombre */
  --popover: 218 22% 9%;
  --popover-foreground: 218 10% 90%;

  /* Toolbar background */
  --toolbar: 218 20% 18%;

  /* Primary reste inchangé (bleu d'accent) */
  --primary: 225 85% 53%;
  --primary-foreground: 218 25% 8%;

  /* Secondary reste inchangé */
  --secondary: 270 60% 60%;
  --secondary-foreground: 218 10% 90%;

  /* Muted surfaces */
  --muted: 218 15% 20%;
  --muted-foreground: 218 12% 70%;

  /* Accent reste inchangé */
  --accent: 186 80% 40%;
  --accent-foreground: 218 10% 90%;

  /* Destructive reste inchangé */
  --destructive: 0 72% 51%;
  --destructive-foreground: 218 10% 90%;

  /* Borders & Inputs */
  --border: 218 15% 18%;
  --input: 218 18% 15%;
  --ring: 225 85% 53%;

  /* Custom gaming colors */
  --glow-primary: 225 85% 53%;
  --glow-secondary: 270 60% 60%;
  --surface-elevated: 218 18% 14%;
  --surface-hover: 218 18% 22%;
  
  /* Status colors restent inchangés */
  --online: 142 76% 46%;
  --idle: 38 92% 50%;
  --dnd: 0 72% 51%;
  --offline: 218 15% 45%;
  --voice-active: 142 76% 46%;
  --poll-background: 218 20% 10%;

  /* Gradients - ajustés */
  --gradient-surface: linear-gradient(180deg, hsl(218 18% 14%), hsl(218 20% 10%));

  /* Server List Sidebar */
  --sidebar-background: 218 25% 7%;
  --sidebar-foreground: 218 10% 90%;
  --sidebar-primary: 225 85% 53%;
  --sidebar-primary-foreground: 218 25% 8%;
  --sidebar-accent: 218 18% 20%;
  --sidebar-accent-foreground: 218 10% 90%;
  --sidebar-border: 218 15% 16%;
  --sidebar-ring: 225 85% 53%;

  /* User Profile Panel */
  --user-panel: 218 22% 9%;
}
```

### Section `.dark` (lignes 182-186)

```css
.dark {
  /* Identique à root - toujours sombre */
  --background: 218 18% 12%;
  --foreground: 218 10% 90%;
}
```

---

## Avantages de cette approche

1. **Cohérence** : Toutes les teintes utilisent maintenant ~218° au lieu de 220-233°
2. **Modernité** : Le gris bleuté est plus neutre et contemporain
3. **Lisibilité** : Textes légèrement plus lumineux (90% vs 86%)
4. **Contraste** : Meilleure hiérarchie entre les différentes zones
5. **Compatibilité** : Aucun changement sur les couleurs d'accent (primary, secondary, status)

---

## Notes techniques

- La teinte **218°** correspond à un bleu-gris standard (entre le bleu pur 210° et le bleu-violet 225°)
- La saturation réduite (15-22%) donne un aspect plus "gris" tout en conservant la teinte bleutée
- Les couleurs d'accent (primary bleu, secondary violet, status verts/oranges/rouges) restent inchangées pour maintenir les interactions visuelles

