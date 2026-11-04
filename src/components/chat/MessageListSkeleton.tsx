/*
 * Squelette du premier chargement d'un salon, comme Discord : groupes de
 * messages fictifs (avatar rond, nom, lignes de largeurs variees) ancres en bas.
 */
const GROUPS: { name: number; lines: number[] }[] = [
  { name: 22, lines: [62, 38] },
  { name: 16, lines: [80] },
  { name: 26, lines: [45, 70, 30] },
  { name: 18, lines: [55] },
  { name: 24, lines: [72, 48] },
];

export function MessageListSkeleton() {
  return (
    <div className="pb-2 space-y-5" aria-busy="true" aria-label="Chargement des messages">
      {GROUPS.map((g, i) => (
        <div key={i} className="flex gap-4 animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="w-10 h-10 rounded-full bg-[hsl(var(--button-secondary))] shrink-0" />
          <div className="flex-1 min-w-0 space-y-2 pt-1">
            <div className="h-4 rounded-full bg-[hsl(var(--button-secondary))]" style={{ width: `${g.name}%`, maxWidth: 220 }} />
            {g.lines.map((w, j) => (
              <div key={j} className="h-4 rounded-full bg-[hsl(var(--surface-card))]" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
