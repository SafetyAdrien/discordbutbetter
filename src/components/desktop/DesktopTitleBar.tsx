import { useEffect, useState } from 'react';
import { getDesktopWindow, type DesktopWindow } from '@/lib/desktopBridge';
import { ArrowLeft, ArrowRight } from '@/components/icons/discord/lucide';
import { createDiscordIcon } from '@/components/icons/discord/createDiscordIcon';
import { diHelp, diStaffTools } from '@/components/icons/discord/discordIconData';
import { Tooltip, TooltipContent, TooltipShortcut, TooltipTrigger } from '@/components/ui/tooltip';
import { useDesktopTitle } from '@/lib/desktop';
import { Compass } from '@/components/icons/discord/lucide';
import { InboxButton } from '@/components/inbox/InboxButton';
import { cn } from '@/lib/utils';

const HelpIcon = createDiscordIcon(diHelp, 'TitleHelp');
const ToolsIcon = createDiscordIcon(diStaffTools, 'TitleTools');

export const DESKTOP_TITLEBAR_HEIGHT = 32;

/*
 * Barre de titre de l'application de bureau (reference : Discord Desktop,
 * 32px). La fenetre n'a plus de decoration systeme : la barre se glisse pour
 * deplacer la fenetre (double clic = agrandir) et porte les boutons reduire /
 * agrandir / fermer. Inbox, aide et outils n'ont pas encore de backend.
 */
export function DesktopTitleBar() {
  const { name, iconUrl, glyph } = useDesktopTitle();
  const [maximized, setMaximized] = useState(false);
  const [win, setWin] = useState<DesktopWindow | null>(null);
  useEffect(() => { void getDesktopWindow().then(setWin); }, []);

  useEffect(() => {
    if (!win) return;
    let un: (() => void) | undefined;
    let gone = false;
    void win.isMaximized().then(setMaximized);
    void win.onMaximizedChange(setMaximized).then((f) => (gone ? f() : (un = f)));
    return () => { gone = true; un?.(); };
  }, [win]);

  const nav = (label: string, keys: string[], onClick: () => void, children: React.ReactNode) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className="h-[32px] w-[24px] flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white transition-colors"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-center">
        {label}
        <TooltipShortcut keys={keys} />
      </TooltipContent>
    </Tooltip>
  );

  const soon = (label: string, icon: React.ReactNode) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={label} aria-disabled className="h-[32px] w-[36px] flex items-center justify-center text-[hsl(var(--icon-default))] cursor-default">
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label} — Bientôt disponible</TooltipContent>
    </Tooltip>
  );

  const ctrl = (label: string, onClick: () => void, children: React.ReactNode, danger = false) => (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'h-[32px] w-[36px] flex items-center justify-center text-[hsl(var(--icon-default))] transition-colors',
        danger ? 'hover:bg-[#da373c] hover:text-white' : 'hover:bg-white/10 hover:text-white',
      )}
    >
      {children}
    </button>
  );

  return (
    <div
      data-tauri-drag-region
      className="relative h-[32px] shrink-0 flex items-center select-none bg-[hsl(var(--sidebar-background))]"
    >
      <div className="flex items-center pl-[12px]">
        {nav('Retour', ['ALT', '←'], () => window.history.back(), <ArrowLeft className="w-[15px] h-[15px]" />)}
        {nav('Avancer', ['ALT', '→'], () => window.history.forward(), <ArrowRight className="w-[15px] h-[15px] opacity-60" />)}
      </div>

      <div data-tauri-drag-region className="absolute left-1/2 top-0 h-full -translate-x-1/2 flex items-center gap-2 pointer-events-none max-w-[40%]">
        {iconUrl && <img src={iconUrl} alt="" className="h-[15px] w-[15px] rounded-[4px] object-cover" />}
        {!iconUrl && glyph === 'discover' && <span className="h-[15px] w-[15px] rounded-full bg-[#5865f2] flex items-center justify-center text-white"><Compass className="h-2.5 w-2.5" /></span>}
        <span translate="no" className="truncate text-[14px] font-medium text-white">{name ?? 'Discord but Better'}</span>
      </div>

      <div className="ml-auto flex items-center -mr-[3px]">
        <InboxButton />
        {soon('Aide', <HelpIcon className="w-[17px] h-[17px]" />)}
        {soon('Outils', <ToolsIcon className="w-[17px] h-[17px]" />)}
        <span className="mx-[2px] h-5 w-px bg-white/10" />
        {ctrl('Réduire', () => void win?.minimize(), <svg width="10" height="10" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 6.5h11" /></svg>)}
        {ctrl(
          maximized ? 'Restaurer' : 'Agrandir',
          () => void win?.toggleMaximize(),
          maximized ? (
            <svg width="10" height="10" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M3.5 3.5V1h8.5v8.5H9.5" /><rect x="1" y="3.5" width="8.5" height="8.5" /></svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1" y="1" width="11" height="11" /></svg>
          ),
        )}
        {ctrl('Fermer', () => void win?.close(), <svg width="10" height="10" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 1l11 11M12 1L1 12" /></svg>, true)}
      </div>
    </div>
  );
}
