## Objectif
Reproduire à l'identique le side sheet « Customize your theme » de la vidéo, avec toutes les sections, dans le bon ordre, sans oubli.

## Layout cible (fidèle à la vidéo)

```
┌─ Customize your theme ────────── [X] ┐
│                                       │
│ Appearance                            │
│ ┌────────────┐ ┌────────────┐         │
│ │ 🌙 Sombre  │ │ ☀ Clair   │         │
│ └────────────┘ └────────────┘         │
│                                       │
│ Colors                                │
│ ┌───────────────────────────────────┐ │
│ │      SV picker square             │ │
│ └───────────────────────────────────┘ │
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  hue slider       │
│                                       │
│ [■]  #5865F2               [🎨]       │
│                                       │
│ [ + Add Color ]  (full width, dashed) │
│                                       │
│ Palette chips (si >0) : ● ● ●         │
│                                       │
│ Controls                              │
│ Color Intensity              74%      │
│ ▬▬▬▬▬▬▬▬▬●▬▬▬▬▬▬                     │
│                                       │
│      [ ✨ Surprise Me! ]              │
│         Reset                         │
│                                       │
├───────────────────────────────────────┤
│ [🔗]              [ Back ] [ Apply ]  │
└───────────────────────────────────────┘
```

## Changements dans `src/components/appearance/CustomThemeSheet.tsx`

### Supprimer
- La grosse carte "Aperçu en direct" (l'aperçu réel = l'app derrière, comme dans la vidéo).
- Le slider **Angle** (absent de la vidéo).
- La sous-carte "Activer le thème personnalisé" avec Switch (l'activation se fait implicitement au clic sur **Apply**).
- La ligne de secondary actions dupliquée (Surprends-moi / Réinitialiser à côté du switch).

### Ajouter / restructurer
1. **Section `Appearance`** — deux mini-cartes Dark / Light côte à côte (icônes Moon/Sun + libellé), reliées à `useTheme()` pour changer le thème en direct. La carte active a `border-primary bg-primary/5`. Reprend la même logique que `AppearanceSettings`.
2. **Section `Colors`** — dans l'ordre :
   - `HsvColorPicker` (SV + hue).
   - Ligne hex : swatch carré 36px + `<Input>` monospace flex-1 + bouton icône eyedropper (`Pipette` de lucide) qui ouvre `window.EyeDropper` si disponible, sinon désactivé.
   - Bouton pleine largeur "**+ Add Color**" (`border-dashed`, `w-full`, style pill). Désactivé et opacité 50 quand `chips.length >= 3`. Au clic → `addChip()` + sélectionne la nouvelle.
   - Bandeau des chips existantes (uniquement si >1) sur une ligne : chaque chip cliquable = `setSelectedChip`, croix flottante pour supprimer.
3. **Section `Controls`** — libellé + slider `Color Intensity` avec `%` à droite.
4. **Bloc bas centré** :
   - Bouton pill "**Surprise Me!**" (icône Sparkles) → `randomizeDraft()`.
   - Bouton texte "**Reset**" en dessous, ghost, → `resetCustomTheme()`.
5. **Footer** inchangé structurellement : icône Share à gauche, `Back` (= Annuler/Fermer) et `Apply` à droite. Adapter `applyDraft` pour activer automatiquement le thème (`setDraft({ enabled: true })` avant `applyDraft()` si couleurs présentes) pour respecter la vidéo où Apply active tout.

### Styles
- Espacement vertical entre sections : `space-y-5`.
- Labels de section : `text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2`.
- Cartes Appearance : `rounded-2xl border p-3 flex flex-col items-start gap-2`.
- Slider intensité : garder shadcn `Slider`.
- Le panneau lui-même (portail, non-modal, slide from right, largeur 420px, pas de backdrop) est conservé — c'est déjà conforme.

## Fichiers touchés
- `src/components/appearance/CustomThemeSheet.tsx` — refonte du contenu.

Aucun autre fichier n'est modifié.
