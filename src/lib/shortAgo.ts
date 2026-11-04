/** "Il y a 6 h", "Il y a 5 min", "Il y a 2 j" (forme courte de la reference). */
export function shortAgo(date: Date): string {
  const min = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `Il y a ${d} j`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `Il y a ${mo} mois`;
  const y = Math.floor(mo / 12);
  return `Il y a ${y} an${y > 1 ? 's' : ''}`;
}
