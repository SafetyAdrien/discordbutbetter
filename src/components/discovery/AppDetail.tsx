import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ChevronRight, Flag, Link as LinkIcon, Lock, FileText } from '@/components/icons/discord/lucide';
import { MoreHorizontal, ChevronDown, ChevronLeft, UserPlus, Store } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MarkdownText } from '@/lib/markdown';
import { copyToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import { useDiscoverApps, type DiscoverApp } from '@/hooks/useDiscovery';
import { APP_CATEGORY_LABEL } from './discoveryConfig';
import { AppCard } from './DiscoveryParts';

/*
 * Fiche d'une application (video de reference) : banniere, icone, nom, boutons (Lancer / Ajouter l'application /
 * lien / ...), galerie, colonne d'informations (serveurs, categories, langues, liens), vue d'ensemble repliable,
 * commandes, acces aux donnees et suggestions. Une barre fixe reprend nom et boutons une fois la banniere defilee.
 */

const Soon = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <Tooltip>
    <TooltipTrigger asChild><span className="inline-flex" tabIndex={0}>{children}</span></TooltipTrigger>
    <TooltipContent>{label} — bientôt disponible</TooltipContent>
  </Tooltip>
);

export function AppDetail({ app, onBack, onOpenApp }: { app: DiscoverApp; onBack: () => void; onOpenApp: (a: DiscoverApp) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [shot, setShot] = useState(0);
  const { data: all = [] } = useDiscoverApps();

  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); setShot(0); setMore(false); }, [app.id]);
  const related = all.filter((a) => a.id !== app.id && a.category === app.category).slice(0, 3);
  const gallery = app.gallery.length ? app.gallery : app.banner_url ? [app.banner_url] : [];

  const actions = (compact: boolean) => (
    <div className="flex items-center gap-2 shrink-0">
      <Soon label="Lancer"><button type="button" disabled className={cn('rounded-[3px] bg-[#5865f2] text-white font-medium opacity-60 cursor-not-allowed', compact ? 'h-7 px-3 text-xs' : 'h-10 px-5 text-sm')}>Lancer</button></Soon>
      <button type="button" onClick={() => setAddOpen(true)} className={cn('rounded-[3px] bg-white/[0.08] hover:bg-white/[0.14] text-white font-medium transition-colors', compact ? 'h-7 px-3 text-xs' : 'h-10 px-5 text-sm')}>Ajouter l'application</button>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label="Copier le lien" onClick={() => void copyToClipboard(`${window.location.origin}/?discover=apps&app=${app.id}`, 'Lien copié')} className={cn('rounded-[3px] bg-white/[0.08] hover:bg-white/[0.14] text-white flex items-center justify-center transition-colors', compact ? 'h-7 w-7' : 'h-10 w-10')}>
            <LinkIcon className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Copier le lien</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Plus" className={cn('rounded-[3px] bg-white/[0.08] hover:bg-white/[0.14] text-white flex items-center justify-center transition-colors data-[state=open]:bg-white/[0.14]', compact ? 'h-7 w-7' : 'h-10 w-10')}>
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[280px] p-2">
          <DropdownMenuItem disabled className="gap-2.5 text-[#f57976] h-10"><Flag className="w-5 h-5" /> Signaler l'application <span className="ml-auto text-[10px] text-[#b5bac1]">Bientôt</span></DropdownMenuItem>
          <DropdownMenuItem className="gap-2.5 h-10" onSelect={() => void copyToClipboard(app.id, 'Identifiant copié')}><span className="w-5 h-5 rounded-[4px] border border-current text-[9px] font-bold flex items-center justify-center">ID</span> Copier l'identifiant de l'application</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const linkIcon = (k?: string) => (k === 'terms' ? <FileText className="w-5 h-5" /> : k === 'privacy' ? <Lock className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />);

  return (
    <div className="relative flex-1 min-h-0 flex flex-col animate-fade-in">
      <div className={cn('shrink-0 h-[50px] px-3 flex items-center gap-3 relative z-20 transition-colors duration-150', scrolled ? 'bg-[#313139] border-b border-black/20' : 'bg-transparent absolute top-0 left-0 right-0')}>
        <button type="button" aria-label="Retour" onClick={onBack} className="h-8 w-8 rounded-md bg-[#2b2c31]/80 hover:bg-[#2b2c31] flex items-center justify-center text-[#dbdee1] hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <span translate="no" className={cn('absolute left-1/2 -translate-x-1/2 text-base font-semibold text-white transition-opacity', scrolled ? 'opacity-100' : 'opacity-0')}>{app.name}</span>
        <div className={cn('ml-auto transition-opacity', scrolled ? 'opacity-100' : 'opacity-0 pointer-events-none')}>{actions(true)}</div>
      </div>

      <div ref={scroller} onScroll={(e) => setScrolled((e.target as HTMLElement).scrollTop > 270)} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="h-[267px] bg-[#2b2c31] overflow-hidden" style={app.banner_url ? undefined : { background: 'linear-gradient(135deg,#3a4a8a,#1c2150)' }}>
          {app.banner_url && <img src={app.banner_url} alt="" className="w-full h-full object-cover" draggable={false} />}
        </div>
        <div className="px-5 -mt-[52px] relative">
          <span className="block w-[104px] h-[104px] rounded-[22px] border-[4px] border-[#313139] bg-[#2b2c31] overflow-hidden">
            {app.icon_url ? <img src={app.icon_url} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-3xl font-bold text-white">{app.name.slice(0, 2).toUpperCase()}</span>}
          </span>
          <div className="mt-2 flex items-center gap-4 flex-wrap">
            <h1 translate="no" className="text-[32px] leading-10 font-medium text-white mr-auto">{app.name}</h1>
            {actions(false)}
          </div>
        </div>

        <div className="px-5 mt-6 pb-12 flex gap-8 items-start flex-wrap lg:flex-nowrap">
          <div className="flex-1 min-w-0">
            {gallery.length > 0 && (
              <div className="relative rounded-lg overflow-hidden bg-black/30 aspect-video">
                {gallery.map((g, i) => <img key={g} src={g} alt="" className={cn('absolute inset-0 w-full h-full object-cover transition-opacity duration-300', i === shot ? 'opacity-100' : 'opacity-0')} draggable={false} />)}
              </div>
            )}
            {gallery.length > 1 && (
              <div className="mt-3 flex items-center justify-center gap-4 text-[#dbdee1]">
                <button type="button" aria-label="Précédent" onClick={() => setShot((s) => (s - 1 + gallery.length) % gallery.length)} className="hover:text-white"><ChevronLeft className="w-5 h-5" /></button>
                <div className="flex gap-1.5">{gallery.map((g, i) => <button key={g} type="button" aria-label={`Image ${i + 1}`} onClick={() => setShot(i)} className={cn('w-1.5 h-1.5 rounded-full transition-colors', i === shot ? 'bg-white' : 'bg-white/30 hover:bg-white/60')} />)}</div>
                <button type="button" aria-label="Suivant" onClick={() => setShot((s) => (s + 1) % gallery.length)} className="hover:text-white"><ChevronRight className="w-5 h-5" /></button>
              </div>
            )}

            <h2 className="mt-8 text-xl font-semibold text-white">Vue d'ensemble</h2>
            <div className={cn('mt-3 text-sm text-[#dbdee1] overflow-hidden transition-[max-height] duration-300', more ? 'max-h-[4000px]' : 'max-h-[170px]')}>
              <MarkdownText content={app.description || app.tagline || 'Aucune description.'} variant="chat" />
            </div>
            {(app.description?.length ?? 0) > 380 && (
              <button type="button" onClick={() => setMore((m) => !m)} className="mt-2 mx-auto flex items-center gap-1 text-sm font-medium text-[#dbdee1] hover:text-white">
                {more ? 'Afficher moins' : 'Afficher plus'} <ChevronDown className={cn('w-4 h-4 transition-transform', more && 'rotate-180')} />
              </button>
            )}

            {app.commands.length > 0 && (
              <>
                <h2 className="mt-8 text-lg font-semibold text-white">Commandes slash populaires</h2>
                <div className="mt-3 rounded-lg border border-white/[0.06] divide-y divide-white/[0.06]">
                  {app.commands.map((c) => (
                    <div key={c.name} className="px-3 py-2.5 flex items-center gap-4 text-sm">
                      <code className="px-2 py-0.5 rounded bg-black/25 text-[#dbdee1] text-[13px]">{c.name}</code>
                      <span className="text-[#dbdee1]">{c.description}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h2 className="mt-8 text-lg font-semibold text-white">Accès aux données</h2>
            <p className="mt-2 text-sm leading-[18px] text-[#dbdee1]">Toutes les applications ont accès à un ensemble de données de base. Rends-toi sur le centre d'aide pour en savoir plus.</p>

            {related.length > 0 && (
              <>
                <h2 className="mt-10 text-sm font-semibold text-white">Tu aimeras peut-être aussi</h2>
                <div className="mt-3 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
                  {related.map((a) => <AppCard key={a.id} app={a} onOpen={() => onOpenApp(a)} />)}
                </div>
              </>
            )}
          </div>

          <aside className="w-full lg:w-[290px] shrink-0 text-sm text-[#dbdee1] space-y-6">
            <div>
              <p className="font-semibold text-white mb-2">Nombre de serveurs</p>
              <p>{app.server_count > 0 ? `dans ${app.server_count.toLocaleString('fr-FR')} serveur${app.server_count > 1 ? 's' : ''}` : 'Pas encore ajoutée à un serveur'}</p>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">Catégories</p>
              <div className="flex flex-wrap gap-2"><span className="px-3 h-8 rounded-[4px] border border-white/[0.12] text-white flex items-center">{APP_CATEGORY_LABEL[app.category]}</span></div>
            </div>
            {app.languages.length > 0 && (
              <div><p className="font-semibold text-white mb-2">Langues prises en charge</p><p>{app.languages.join(', ')}</p></div>
            )}
            {app.links.length > 0 && (
              <div>
                <p className="font-semibold text-white mb-2">Liens</p>
                <ul className="space-y-2.5">
                  {app.links.map((l) => (
                    <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-white hover:underline">{linkIcon(l.kind)} {l.label}</a></li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-[480px] p-0 bg-[#3b3b45] border-white/[0.08] overflow-hidden">
          <DialogTitle className="sr-only">Ajouter {app.name}</DialogTitle>
          <div className="px-8 pt-10 pb-8 text-center">
            <span className="mx-auto block w-20 h-20 rounded-[18px] overflow-hidden bg-[#2b2c31]">{app.icon_url ? <img src={app.icon_url} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">{app.name.slice(0, 2).toUpperCase()}</span>}</span>
            <p translate="no" className="mt-4 text-xl font-semibold text-white">{app.name}</p>
            <p translate="no" className="mt-5 text-left text-sm leading-[18px] text-[#dbdee1]">{app.tagline || app.description}</p>
            <div className="mt-6 space-y-1 text-left">
              {[{ Icon: UserPlus, t: 'Ajoute à Mes applications', d: 'Utilise cette appli partout !' }, { Icon: Store, t: 'Ajouter au serveur', d: 'Personnalise ton serveur en ajoutant cette application' }].map(({ Icon, t, d }) => (
                <Tooltip key={t}>
                  <TooltipTrigger asChild>
                    <div aria-disabled className="w-full flex items-center gap-3 px-3 h-[60px] rounded-md bg-black/10 opacity-70 cursor-not-allowed">
                      <Icon className="w-5 h-5 text-[#dbdee1] shrink-0" />
                      <span className="flex-1 min-w-0"><span className="block text-sm font-medium text-white">{t}</span><span className="block text-xs text-[#b5bac1]">{d}</span></span>
                      <ChevronRight className="w-4 h-4 text-[#b5bac1]" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Bientôt disponible</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
