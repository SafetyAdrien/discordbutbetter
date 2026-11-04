import { Plus } from '@/components/icons/discord/lucide';

/* Etat vide de la vue Favoris (video de reference) : etoile rose en 3D, titre, texte, bouton "Ajouter aux favoris". */
export function FavoritesEmpty() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <svg viewBox="0 0 160 160" className="h-[104px] w-[104px]" aria-hidden>
        <defs>
          <linearGradient id="fav-g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7b6cff" /><stop offset="1" stopColor="#4b50e6" /></linearGradient>
          <linearGradient id="fav-g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff7be5" /><stop offset="1" stopColor="#d23fc9" /></linearGradient>
        </defs>
        <rect x="26" y="22" width="108" height="108" rx="26" transform="rotate(-6 80 76)" fill="url(#fav-g1)" />
        <rect x="40" y="36" width="108" height="108" rx="26" transform="rotate(-6 94 90)" fill="#1d1e3a" opacity=".55" />
        <path d="M80 42l11 24 26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3z" fill="url(#fav-g2)" stroke="#1a1130" strokeWidth="5" strokeLinejoin="round" transform="rotate(-6 80 76)" />
      </svg>
      <h2 className="mt-5 max-w-[420px] text-[24px] font-semibold leading-[30px] text-white">Tes conversations favorites, toutes au même endroit.</h2>
      <p className="mt-2 max-w-[400px] text-base leading-[22px] text-[#b5bac1]">Regroupe tes salons et MP les plus utilisés au même endroit pour un accès rapide.</p>
      <button type="button" onClick={() => window.dispatchEvent(new Event('open-add-favorites'))} className="mt-5 flex h-10 items-center gap-2 rounded-lg bg-[#5865f2] px-4 text-base font-medium text-white transition-colors hover:bg-[#4752c4]">
        <Plus className="h-5 w-5" /> Ajouter aux favoris
      </button>
    </div>
  );
}
