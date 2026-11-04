/**
 * Bannieres predefinies du "Profil du serveur" (Discord) : un degrade par
 * couleur, utilise quand le serveur n'a pas de banniere importee.
 */
export const BANNER_PRESETS: { id: string; label: string; css: string }[] = [
  { id: 'default', label: 'Gris', css: 'radial-gradient(120% 100% at 50% 100%, #8e8f97 0%, #4a4b52 45%, #2c2d32 100%)' },
  { id: 'pink', label: 'Rose', css: 'linear-gradient(180deg, #ff4fb7 0%, #ff8ad0 100%)' },
  { id: 'red', label: 'Rouge', css: 'linear-gradient(180deg, #e8242b 0%, #ff6b5e 100%)' },
  { id: 'orange', label: 'Orange', css: 'linear-gradient(180deg, #ef6a12 0%, #ffa24c 100%)' },
  { id: 'yellow', label: 'Jaune', css: 'linear-gradient(180deg, #f5c22f 0%, #fff07a 100%)' },
  { id: 'purple', label: 'Violet', css: 'linear-gradient(180deg, #8e44c2 0%, #c48ae8 100%)' },
  { id: 'blue', label: 'Bleu', css: 'linear-gradient(180deg, #1593ff 0%, #6fd2ff 100%)' },
  { id: 'teal', label: 'Turquoise', css: 'linear-gradient(180deg, #31d2b7 0%, #a2f5e6 100%)' },
  { id: 'green', label: 'Vert', css: 'linear-gradient(180deg, #3f7d10 0%, #79b23a 100%)' },
  { id: 'dark', label: 'Sombre', css: 'radial-gradient(120% 100% at 50% 100%, #5a5b62 0%, #2b2c31 55%, #1a1a1e 100%)' },
];

export function bannerPresetCss(id: string | null | undefined): string {
  return (BANNER_PRESETS.find((p) => p.id === id) ?? BANNER_PRESETS[0]).css;
}
