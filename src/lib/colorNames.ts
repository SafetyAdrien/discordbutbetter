/**
 * Color name resolver — returns the nearest CSS named color (French label)
 * for any hex code. Distance is plain Euclidean RGB; always returns a name.
 *
 * Table = the 148 standard CSS Level 4 named colors, translated into French
 * (kept consistent with the rest of the FR UI). Some duplicates between the
 * spec (gray/grey) are intentionally merged.
 */

export interface NamedColor {
  hex: string; // 6-digit lower-case #rrggbb
  name: string; // French display name
}

export const NAMED_COLORS: NamedColor[] = [
  // Reds
  { hex: '#ffb6c1', name: 'Rose clair' },
  { hex: '#ffc0cb', name: 'Rose' },
  { hex: '#ff69b4', name: 'Rose vif' },
  { hex: '#ff1493', name: 'Rose profond' },
  { hex: '#db7093', name: 'Rose pâle violacé' },
  { hex: '#c71585', name: 'Violet moyen' },
  { hex: '#ff0000', name: 'Rouge' },
  { hex: '#dc143c', name: 'Cramoisi' },
  { hex: '#b22222', name: 'Rouge brique' },
  { hex: '#8b0000', name: 'Rouge foncé' },
  { hex: '#cd5c5c', name: 'Rouge indien' },
  { hex: '#f08080', name: 'Corail clair' },
  { hex: '#fa8072', name: 'Saumon' },
  { hex: '#e9967a', name: 'Saumon foncé' },
  { hex: '#ffa07a', name: 'Saumon clair' },
  { hex: '#ff7f50', name: 'Corail' },
  { hex: '#ff6347', name: 'Tomate' },
  { hex: '#ff4500', name: 'Rouge orangé' },
  // Oranges
  { hex: '#ffa500', name: 'Orange' },
  { hex: '#ff8c00', name: 'Orange foncé' },
  { hex: '#ffd700', name: 'Or' },
  { hex: '#daa520', name: 'Verge d’or' },
  { hex: '#b8860b', name: 'Verge d’or foncé' },
  // Yellows
  { hex: '#ffff00', name: 'Jaune' },
  { hex: '#ffffe0', name: 'Jaune clair' },
  { hex: '#fffacd', name: 'Chiffon citron' },
  { hex: '#fafad2', name: 'Verge d’or clair' },
  { hex: '#ffefd5', name: 'Papaye fouetté' },
  { hex: '#ffe4b5', name: 'Mocassin' },
  { hex: '#ffdab9', name: 'Pêche' },
  { hex: '#eee8aa', name: 'Verge d’or pâle' },
  { hex: '#f0e68c', name: 'Kaki' },
  { hex: '#bdb76b', name: 'Kaki foncé' },
  // Browns
  { hex: '#fff8dc', name: 'Soie de maïs' },
  { hex: '#ffebcd', name: 'Amande blanchie' },
  { hex: '#ffe4c4', name: 'Biscuit' },
  { hex: '#ffdead', name: 'Bois flotté' },
  { hex: '#f5deb3', name: 'Blé' },
  { hex: '#deb887', name: 'Bois brûlé' },
  { hex: '#d2b48c', name: 'Beige bronzé' },
  { hex: '#bc8f8f', name: 'Brun rosé' },
  { hex: '#f4a460', name: 'Brun sable' },
  { hex: '#cd853f', name: 'Pérou' },
  { hex: '#d2691e', name: 'Chocolat' },
  { hex: '#8b4513', name: 'Brun selle' },
  { hex: '#a0522d', name: 'Sienne' },
  { hex: '#a52a2a', name: 'Marron' },
  { hex: '#800000', name: 'Bordeaux' },
  // Greens
  { hex: '#556b2f', name: 'Olive foncé' },
  { hex: '#808000', name: 'Olive' },
  { hex: '#6b8e23', name: 'Olivâtre' },
  { hex: '#9acd32', name: 'Jaune-vert' },
  { hex: '#adff2f', name: 'Vert jaune' },
  { hex: '#7cfc00', name: 'Vert pelouse' },
  { hex: '#7fff00', name: 'Chartreuse' },
  { hex: '#98fb98', name: 'Vert pâle' },
  { hex: '#90ee90', name: 'Vert clair' },
  { hex: '#8fbc8f', name: 'Vert marin foncé' },
  { hex: '#00fa9a', name: 'Vert printemps moyen' },
  { hex: '#00ff7f', name: 'Vert printemps' },
  { hex: '#3cb371', name: 'Vert mer moyen' },
  { hex: '#2e8b57', name: 'Vert mer' },
  { hex: '#228b22', name: 'Vert forêt' },
  { hex: '#008000', name: 'Vert' },
  { hex: '#006400', name: 'Vert foncé' },
  { hex: '#00ff00', name: 'Citron vert' },
  { hex: '#32cd32', name: 'Vert lime' },
  { hex: '#66cdaa', name: 'Aigue-marine moyenne' },
  { hex: '#20b2aa', name: 'Vert mer clair' },
  // Cyans / teals
  { hex: '#00ffff', name: 'Cyan' },
  { hex: '#e0ffff', name: 'Cyan clair' },
  { hex: '#afeeee', name: 'Turquoise pâle' },
  { hex: '#7fffd4', name: 'Aigue-marine' },
  { hex: '#40e0d0', name: 'Turquoise' },
  { hex: '#48d1cc', name: 'Turquoise moyen' },
  { hex: '#00ced1', name: 'Turquoise foncé' },
  { hex: '#008b8b', name: 'Cyan foncé' },
  { hex: '#008080', name: 'Sarcelle' },
  // Blues
  { hex: '#5f9ea0', name: 'Bleu cadet' },
  { hex: '#b0e0e6', name: 'Bleu poudre' },
  { hex: '#add8e6', name: 'Bleu clair' },
  { hex: '#87ceeb', name: 'Bleu ciel' },
  { hex: '#87cefa', name: 'Bleu ciel clair' },
  { hex: '#00bfff', name: 'Bleu ciel profond' },
  { hex: '#1e90ff', name: 'Bleu dodger' },
  { hex: '#6495ed', name: 'Bleuet' },
  { hex: '#4682b4', name: 'Bleu acier' },
  { hex: '#4169e1', name: 'Bleu roi' },
  { hex: '#0000ff', name: 'Bleu' },
  { hex: '#0000cd', name: 'Bleu moyen' },
  { hex: '#00008b', name: 'Bleu foncé' },
  { hex: '#000080', name: 'Bleu marine' },
  { hex: '#191970', name: 'Bleu nuit' },
  // Purples / violets
  { hex: '#e6e6fa', name: 'Lavande' },
  { hex: '#d8bfd8', name: 'Chardon' },
  { hex: '#dda0dd', name: 'Prune' },
  { hex: '#ee82ee', name: 'Violet' },
  { hex: '#da70d6', name: 'Orchidée' },
  { hex: '#ff00ff', name: 'Magenta' },
  { hex: '#ba55d3', name: 'Orchidée moyenne' },
  { hex: '#9370db', name: 'Pourpre moyen' },
  { hex: '#8a2be2', name: 'Bleu violet' },
  { hex: '#9400d3', name: 'Violet foncé' },
  { hex: '#9932cc', name: 'Orchidée foncée' },
  { hex: '#8b008b', name: 'Magenta foncé' },
  { hex: '#800080', name: 'Pourpre' },
  { hex: '#4b0082', name: 'Indigo' },
  { hex: '#483d8b', name: 'Ardoise foncée bleu' },
  { hex: '#6a5acd', name: 'Ardoise bleu' },
  { hex: '#7b68ee', name: 'Ardoise moyenne bleu' },
  // Whites
  { hex: '#ffffff', name: 'Blanc' },
  { hex: '#fffafa', name: 'Neige' },
  { hex: '#f0fff0', name: 'Miellat' },
  { hex: '#f5fffa', name: 'Crème menthe' },
  { hex: '#f0ffff', name: 'Azur' },
  { hex: '#f0f8ff', name: 'Bleu d’Alice' },
  { hex: '#f8f8ff', name: 'Blanc fantôme' },
  { hex: '#f5f5f5', name: 'Blanc fumée' },
  { hex: '#fff5ee', name: 'Coquillage' },
  { hex: '#f5f5dc', name: 'Beige' },
  { hex: '#fdf5e6', name: 'Lin ancien' },
  { hex: '#fffaf0', name: 'Blanc floral' },
  { hex: '#fffff0', name: 'Ivoire' },
  { hex: '#faebd7', name: 'Blanc antique' },
  { hex: '#faf0e6', name: 'Lin' },
  { hex: '#fff0f5', name: 'Lavande rosée' },
  { hex: '#ffe4e1', name: 'Brume rosée' },
  // Grays / black
  { hex: '#dcdcdc', name: 'Gainsboro' },
  { hex: '#d3d3d3', name: 'Gris clair' },
  { hex: '#c0c0c0', name: 'Argent' },
  { hex: '#a9a9a9', name: 'Gris foncé' },
  { hex: '#808080', name: 'Gris' },
  { hex: '#696969', name: 'Gris ardoise foncé' },
  { hex: '#778899', name: 'Gris ardoise clair' },
  { hex: '#708090', name: 'Gris ardoise' },
  { hex: '#2f4f4f', name: 'Ardoise foncée' },
  { hex: '#000000', name: 'Noir' },
];

function parseHex(input: string): [number, number, number] | null {
  let h = (input || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * Returns the French name of the nearest CSS named color.
 * Always returns a string — falls back to "Couleur" on invalid input.
 */
export function nearestColorName(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return 'Couleur';
  let bestName = NAMED_COLORS[0].name;
  let bestDist = Infinity;
  for (const c of NAMED_COLORS) {
    const cRgb = parseHex(c.hex)!;
    const dr = rgb[0] - cRgb[0];
    const dg = rgb[1] - cRgb[1];
    const db = rgb[2] - cRgb[2];
    const d = dr * dr + dg * dg + db * db;
    if (d < bestDist) {
      bestDist = d;
      bestName = c.name;
      if (d === 0) break;
    }
  }
  return bestName;
}

/** Normalize any user input into a canonical `#rrggbb` lowercase string, or null. */
export function normalizeHex(input: string): string | null {
  const rgb = parseHex(input);
  if (!rgb) return null;
  return (
    '#' +
    rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toLowerCase()
  );
}
