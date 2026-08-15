interface BirthdayRibbonProps {
  displayName: string;
}

export function BirthdayRibbon({ displayName }: BirthdayRibbonProps) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <div
        className="px-4 py-1.5 rounded-full text-xs font-semibold text-black shadow-lg animate-fade-in"
        style={{
          background:
            'linear-gradient(90deg, #ffd54a 0%, #f5b301 50%, #ff9500 100%)',
        }}
      >
        🎉 C'est l'anniversaire de {displayName} aujourd'hui !
      </div>
    </div>
  );
}
