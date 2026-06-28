/**
 * Color name resolver — returns the nearest CSS named color (English label)
 * for any hex code. Distance is plain Euclidean RGB; always returns a name.
 *
 * Table = the 148 standard CSS Level 4 named colors, plus the Discord
 * brand color "Blurple" (#5865F2) as a custom entry. The exact-match
 * short-circuit in nearestColorName() ensures #5865F2 returns "Blurple".
 */

export interface NamedColor {
  hex: string; // 6-digit lower-case #rrggbb
  name: string; // English display name
}

export const NAMED_COLORS: NamedColor[] = [
  // Custom brand
  { hex: '#5865F2', name: 'Blurple' },

  // Pinks / Reds
  { hex: '#ffb6c1', name: 'LightPink' },
  { hex: '#ffc0cb', name: 'Pink' },
  { hex: '#ff69b4', name: 'HotPink' },
  { hex: '#ff1493', name: 'DeepPink' },
  { hex: '#db7093', name: 'PaleVioletRed' },
  { hex: '#c71585', name: 'MediumVioletRed' },
  { hex: '#ff0000', name: 'Red' },
  { hex: '#dc143c', name: 'Crimson' },
  { hex: '#b22222', name: 'FireBrick' },
  { hex: '#8b0000', name: 'DarkRed' },
  { hex: '#cd5c5c', name: 'IndianRed' },
  { hex: '#f08080', name: 'LightCoral' },
  { hex: '#fa8072', name: 'Salmon' },
  { hex: '#e9967a', name: 'DarkSalmon' },
  { hex: '#ffa07a', name: 'LightSalmon' },
  { hex: '#ff7f50', name: 'Coral' },
  { hex: '#ff6347', name: 'Tomato' },
  { hex: '#ff4500', name: 'OrangeRed' },

  // Oranges
  { hex: '#ffa500', name: 'Orange' },
  { hex: '#ff8c00', name: 'DarkOrange' },
  { hex: '#ffd700', name: 'Gold' },
  { hex: '#daa520', name: 'GoldenRod' },
  { hex: '#b8860b', name: 'DarkGoldenRod' },

  // Yellows
  { hex: '#ffff00', name: 'Yellow' },
  { hex: '#ffffe0', name: 'LightYellow' },
  { hex: '#fffacd', name: 'LemonChiffon' },
  { hex: '#fafad2', name: 'LightGoldenRodYellow' },
  { hex: '#ffefd5', name: 'PapayaWhip' },
  { hex: '#ffe4b5', name: 'Moccasin' },
  { hex: '#ffdab9', name: 'PeachPuff' },
  { hex: '#eee8aa', name: 'PaleGoldenRod' },
  { hex: '#f0e68c', name: 'Khaki' },
  { hex: '#bdb76b', name: 'DarkKhaki' },

  // Browns
  { hex: '#fff8dc', name: 'Cornsilk' },
  { hex: '#ffebcd', name: 'BlanchedAlmond' },
  { hex: '#ffe4c4', name: 'Bisque' },
  { hex: '#ffdead', name: 'NavajoWhite' },
  { hex: '#f5deb3', name: 'Wheat' },
  { hex: '#deb887', name: 'BurlyWood' },
  { hex: '#d2b48c', name: 'Tan' },
  { hex: '#bc8f8f', name: 'RosyBrown' },
  { hex: '#f4a460', name: 'SandyBrown' },
  { hex: '#cd853f', name: 'Peru' },
  { hex: '#d2691e', name: 'Chocolate' },
  { hex: '#8b4513', name: 'SaddleBrown' },
  { hex: '#a0522d', name: 'Sienna' },
  { hex: '#a52a2a', name: 'Brown' },
  { hex: '#800000', name: 'Maroon' },

  // Greens
  { hex: '#556b2f', name: 'DarkOliveGreen' },
  { hex: '#808000', name: 'Olive' },
  { hex: '#6b8e23', name: 'OliveDrab' },
  { hex: '#9acd32', name: 'YellowGreen' },
  { hex: '#adff2f', name: 'GreenYellow' },
  { hex: '#7cfc00', name: 'LawnGreen' },
  { hex: '#7fff00', name: 'Chartreuse' },
  { hex: '#98fb98', name: 'PaleGreen' },
  { hex: '#90ee90', name: 'LightGreen' },
  { hex: '#8fbc8f', name: 'DarkSeaGreen' },
  { hex: '#00fa9a', name: 'MediumSpringGreen' },
  { hex: '#00ff7f', name: 'SpringGreen' },
  { hex: '#3cb371', name: 'MediumSeaGreen' },
  { hex: '#2e8b57', name: 'SeaGreen' },
  { hex: '#228b22', name: 'ForestGreen' },
  { hex: '#008000', name: 'Green' },
  { hex: '#006400', name: 'DarkGreen' },
  { hex: '#00ff00', name: 'Lime' },
  { hex: '#32cd32', name: 'LimeGreen' },
  { hex: '#66cdaa', name: 'MediumAquaMarine' },
  { hex: '#20b2aa', name: 'LightSeaGreen' },

  // Cyans / Teals
  { hex: '#00ffff', name: 'Aqua' },
  { hex: '#00ffff', name: 'Cyan' },
  { hex: '#e0ffff', name: 'LightCyan' },
  { hex: '#afeeee', name: 'PaleTurquoise' },
  { hex: '#7fffd4', name: 'Aquamarine' },
  { hex: '#40e0d0', name: 'Turquoise' },
  { hex: '#48d1cc', name: 'MediumTurquoise' },
  { hex: '#00ced1', name: 'DarkTurquoise' },
  { hex: '#5f9ea0', name: 'CadetBlue' },
  { hex: '#008b8b', name: 'DarkCyan' },
  { hex: '#008080', name: 'Teal' },

  // Blues
  { hex: '#b0e0e6', name: 'PowderBlue' },
  { hex: '#add8e6', name: 'LightBlue' },
  { hex: '#87ceeb', name: 'SkyBlue' },
  { hex: '#87cefa', name: 'LightSkyBlue' },
  { hex: '#00bfff', name: 'DeepSkyBlue' },
  { hex: '#1e90ff', name: 'DodgerBlue' },
  { hex: '#6495ed', name: 'CornflowerBlue' },
  { hex: '#4682b4', name: 'SteelBlue' },
  { hex: '#4169e1', name: 'RoyalBlue' },
  { hex: '#0000ff', name: 'Blue' },
  { hex: '#0000cd', name: 'MediumBlue' },
  { hex: '#00008b', name: 'DarkBlue' },
  { hex: '#000080', name: 'Navy' },
  { hex: '#191970', name: 'MidnightBlue' },
  { hex: '#b0c4de', name: 'LightSteelBlue' },

  // Purples / Violets
  { hex: '#e6e6fa', name: 'Lavender' },
  { hex: '#d8bfd8', name: 'Thistle' },
  { hex: '#dda0dd', name: 'Plum' },
  { hex: '#ee82ee', name: 'Violet' },
  { hex: '#da70d6', name: 'Orchid' },
  { hex: '#ff00ff', name: 'Fuchsia' },
  { hex: '#ff00ff', name: 'Magenta' },
  { hex: '#ba55d3', name: 'MediumOrchid' },
  { hex: '#9370db', name: 'MediumPurple' },
  { hex: '#663399', name: 'RebeccaPurple' },
  { hex: '#8a2be2', name: 'BlueViolet' },
  { hex: '#9400d3', name: 'DarkViolet' },
  { hex: '#9932cc', name: 'DarkOrchid' },
  { hex: '#8b008b', name: 'DarkMagenta' },
  { hex: '#800080', name: 'Purple' },
  { hex: '#4b0082', name: 'Indigo' },
  { hex: '#483d8b', name: 'DarkSlateBlue' },
  { hex: '#6a5acd', name: 'SlateBlue' },
  { hex: '#7b68ee', name: 'MediumSlateBlue' },

  // Whites
  { hex: '#ffffff', name: 'White' },
  { hex: '#fffafa', name: 'Snow' },
  { hex: '#f0fff0', name: 'HoneyDew' },
  { hex: '#f5fffa', name: 'MintCream' },
  { hex: '#f0ffff', name: 'Azure' },
  { hex: '#f0f8ff', name: 'AliceBlue' },
  { hex: '#f8f8ff', name: 'GhostWhite' },
  { hex: '#f5f5f5', name: 'WhiteSmoke' },
  { hex: '#fff5ee', name: 'SeaShell' },
  { hex: '#f5f5dc', name: 'Beige' },
  { hex: '#fdf5e6', name: 'OldLace' },
  { hex: '#fffaf0', name: 'FloralWhite' },
  { hex: '#fffff0', name: 'Ivory' },
  { hex: '#faebd7', name: 'AntiqueWhite' },
  { hex: '#faf0e6', name: 'Linen' },
  { hex: '#fff0f5', name: 'LavenderBlush' },
  { hex: '#ffe4e1', name: 'MistyRose' },

  // Grays / Black
  { hex: '#dcdcdc', name: 'Gainsboro' },
  { hex: '#d3d3d3', name: 'LightGray' },
  { hex: '#c0c0c0', name: 'Silver' },
  { hex: '#a9a9a9', name: 'DarkGray' },
  { hex: '#a9a9a9', name: 'DarkGrey' },
  { hex: '#808080', name: 'Gray' },
  { hex: '#808080', name: 'Grey' },
  { hex: '#696969', name: 'DimGray' },
  { hex: '#696969', name: 'DimGrey' },
  { hex: '#778899', name: 'LightSlateGray' },
  { hex: '#778899', name: 'LightSlateGrey' },
  { hex: '#708090', name: 'SlateGray' },
  { hex: '#708090', name: 'SlateGrey' },
  { hex: '#2f4f4f', name: 'DarkSlateGray' },
  { hex: '#2f4f4f', name: 'DarkSlateGrey' },
  { hex: '#000000', name: 'Black' },
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
 * Returns the English name of the nearest CSS named color.
 * Always returns a string — falls back to "Color" on invalid input.
 */
export function nearestColorName(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return 'Color';
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
