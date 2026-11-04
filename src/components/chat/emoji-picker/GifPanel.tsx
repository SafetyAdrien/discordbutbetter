import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ArrowLeft, Star, Search as SearchIcon, X } from '@/components/icons/discord/lucide';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useGifSearch, type GifEntry } from './useGifSearch';
import type { FavoriteItem } from './useFavorites';

/*
 * Onglet GIF (video de reference) : accueil en tuiles (Favoris, GIF a la une, termes courants),
 * puis resultats en deux colonnes avec fleche de retour, etoile de favori au survol et
 * ecran "Favoris" avec ses messages quand il est vide.
 */

const TERMS = ['hello', 'lol', 'love', 'happy birthday', 'sad', 'thumbs up', 'scared', 'bye', 'confused', 'angry', 'thank you', 'excited', 'yes', 'no'];

type View = { kind: 'home' } | { kind: 'search'; query: string } | { kind: 'trending' } | { kind: 'favorites' };

function Tile({ term, onClick, children, className }: { term?: string; onClick: () => void; children?: React.ReactNode; className?: string }) {
  const { data } = useGifSearch(term ?? '');
  const bg = term ? data?.[0]?.previewUrl : undefined;
  return (
    <button type="button" onClick={onClick} className={cn('relative h-[100px] rounded-lg overflow-hidden bg-black text-white text-sm font-semibold flex items-end p-2 text-left', className)}>
      {bg && <img src={bg} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
      <span className="relative flex items-center gap-1.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">{children ?? term}</span>
    </button>
  );
}

function Results({ gifs, loading, isFavorite, onToggle, onPick }: { gifs: GifEntry[]; loading: boolean; isFavorite: (id: string) => boolean; onToggle: (g: GifEntry) => void; onPick: (url: string, name: string) => void }) {
  if (loading && !gifs.length) return <div className="h-full flex items-center justify-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!gifs.length) return <div className="h-full flex items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">Aucun GIF trouvé</div>;
  // Deux colonnes "maconnerie" : chaque GIF garde son ratio, on remplit la colonne la plus courte.
  const cols: GifEntry[][] = [[], []];
  const h = [0, 0];
  gifs.forEach((g) => { const i = h[0] <= h[1] ? 0 : 1; cols[i].push(g); h[i] += (g.height || 1) / (g.width || 1); });
  return (
    <div className="flex gap-2">
      {cols.map((c, ci) => (
        <div key={ci} className="flex-1 min-w-0 flex flex-col gap-2">
          {c.map((g) => {
            const fav = isFavorite(g.id);
            return (
              <div key={g.id} className="relative group rounded-lg overflow-hidden bg-white/[0.04]">
                <button type="button" onClick={() => onPick(g.url, g.title || 'GIF')} className="block w-full" style={{ aspectRatio: `${g.width || 4} / ${g.height || 3}` }}>
                  <img src={g.previewUrl} alt={g.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      onClick={(e) => { e.stopPropagation(); onToggle(g); }}
                      className={cn('absolute top-1.5 right-1.5 w-7 h-7 rounded-md flex items-center justify-center bg-black/60 transition-opacity', fav ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
                    >
                      <Star className={cn('w-4 h-4', fav ? 'fill-[#f0b232] text-[#f0b232]' : 'text-white')} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{fav ? 'Ajouté aux favoris' : 'Ajouter aux favoris'}</TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface Props {
  favorites: FavoriteItem[];
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (f: FavoriteItem) => void;
  onPick: (url: string, name: string) => void;
}

export function GifPanel({ favorites, isFavorite, onToggleFavorite, onPick }: Props) {
  const [view, setView] = useState<View>({ kind: 'home' });
  const [text, setText] = useState('');
  const favGifs: GifEntry[] = favorites.flatMap((f) => (f.kind === 'gif' ? [{ id: f.id.replace(/^gif-/, ''), title: f.name, url: f.url, previewUrl: f.previewUrl, width: 4, height: 3 }] : []));
  const query = view.kind === 'search' ? view.query : view.kind === 'trending' ? '' : '';
  const live = useGifSearch(view.kind === 'search' || view.kind === 'trending' ? (text.trim() || query) : '');
  const isFavView = view.kind === 'favorites';
  const shownFav = isFavView && text.trim() ? favGifs.filter((g) => g.title.toLowerCase().includes(text.trim().toLowerCase())) : favGifs;
  const toggle = (g: GifEntry) => onToggleFavorite({ kind: 'gif', id: `gif-${g.id}`, name: g.title || 'GIF', url: g.url, previewUrl: g.previewUrl });

  const go = (v: View) => { setView(v); setText(v.kind === 'search' ? v.query : ''); };
  const onType = (v: string) => {
    setText(v);
    if (v.trim() && view.kind === 'home') setView({ kind: 'search', query: v });
    if (!v.trim() && view.kind === 'search') setView({ kind: 'home' });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-3 p-3 shrink-0">
        {view.kind !== 'home' && (
          <button type="button" aria-label="Retour" onClick={() => go({ kind: 'home' })} className="text-[hsl(var(--header-icon))] hover:text-white flex items-center gap-2 shrink-0">
            <ArrowLeft className="w-5 h-5" />
            {isFavView && <span className="text-sm font-semibold text-white">Favoris</span>}
          </button>
        )}
        <label className="flex-1 min-w-0 flex items-center gap-2 h-10 px-3 rounded-lg bg-[hsl(var(--background))]/70 border-2 border-transparent focus-within:border-primary transition-colors">
          <SearchIcon className="w-5 h-5 text-[hsl(var(--header-icon))] shrink-0" />
          <input
            autoFocus
            value={text}
            onChange={(e) => onType(e.target.value)}
            placeholder={isFavView ? 'Rechercher dans les favoris' : 'Rechercher sur Giphy'}
            aria-label="Rechercher"
            className="flex-1 min-w-0 bg-transparent outline-none text-base text-foreground placeholder:text-[hsl(var(--text-placeholder))]"
          />
          {text && (
            <button type="button" aria-label="Effacer" onClick={() => onType('')} className="w-5 h-5 rounded-full bg-white/[0.15] hover:bg-white/25 flex items-center justify-center text-white shrink-0">
              <X className="w-3 h-3" />
            </button>
          )}
        </label>
      </div>
      <div className="h-px bg-white/[0.07] shrink-0" />
      <div className="flex-1 min-h-0 overflow-y-auto p-3 custom-scrollbar" onWheel={(e) => e.stopPropagation()}>
        {view.kind === 'home' ? (
          <div className="grid grid-cols-2 gap-2">
            <Tile onClick={() => go({ kind: 'favorites' })} className="!bg-primary">
              {favGifs[0] && <img src={favGifs[0].previewUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
              <span className="relative w-full text-center self-center mx-auto">Favoris</span>
            </Tile>
            <Tile term="" onClick={() => go({ kind: 'trending' })}><Star className="w-4 h-4" /> GIF à la une</Tile>
            {TERMS.map((t) => <Tile key={t} term={t} onClick={() => go({ kind: 'search', query: t })} />)}
          </div>
        ) : isFavView ? (
          shownFav.length ? (
            <Results gifs={shownFav} loading={false} isFavorite={isFavorite} onToggle={toggle} onPick={onPick} />
          ) : (
            <div className="grid grid-cols-3 gap-2 text-center text-sm text-[hsl(var(--muted-foreground))]">
              {["Clique sur l'étoile dans le coin d'un GIF pour le mettre dans tes favoris", 'Tes favoris apparaîtront ici !', "Donc euuuh... c'est peut-être le moment d'en mettre certains en favoris, non ?"].map((t) => (
                <div key={t} className="rounded-lg bg-white/[0.04] px-2 py-4">{t}</div>
              ))}
            </div>
          )
        ) : (
          <Results gifs={live.data ?? []} loading={live.isLoading} isFavorite={isFavorite} onToggle={toggle} onPick={onPick} />
        )}
      </div>
    </div>
  );
}
