/**
 * Classes partagees des pages de parametres du serveur, relevees sur la
 * video de reference (fenetre de parametres de Discord).
 */

/** Champ texte : fond plus sombre que la page, bordure fine, rayon 8px. */
export const settingsInputCls =
  "w-full h-10 px-3 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] " +
  "focus:border-primary text-base text-foreground placeholder:text-[hsl(var(--text-placeholder))] " +
  "outline-none transition-colors disabled:opacity-60";

export const settingsTextareaCls = settingsInputCls.replace("h-10", "min-h-[88px] py-2 resize-none");

/** Libelle de champ (16px, semi-gras, blanc). */
export const settingsLabelCls = "block mb-2 text-base font-semibold text-white";

/** Texte d'aide sous un libelle. */
export const settingsHelpCls = "text-sm leading-[18px] text-muted-foreground";

/** Carte posee sur la page (listes, apercus). */
export const settingsCardCls = "rounded-lg bg-[hsl(var(--card))] border border-white/[0.06]";

/** Lien bleu des textes d'aide. */
export const settingsLinkCls = "text-[hsl(var(--text-link))] hover:underline";
