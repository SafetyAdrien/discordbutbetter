import { ChannelSheetIcon } from './ChannelSheetIcon';

/*
 * Icone du salon des regles (carre coche gris de la planche Discord 2026).
 * Meme taille que les autres icones de salon : 20px d'encre dans la liste
 * des salons, mesure sur les videos de reference ("lisez-moi").
 */
export function DiscordRules({ className, size }: { className?: string; size?: number | string }) {
  return <ChannelSheetIcon name="rules" className={className} size={size} />;
}
