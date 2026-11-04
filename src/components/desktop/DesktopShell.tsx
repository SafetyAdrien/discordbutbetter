import { isDesktopApp } from '@/lib/desktop';
import { DesktopTitleBar } from './DesktopTitleBar';

/**
 * Cadre de l'application de bureau : barre de titre en haut, l'app dans le
 * reste. `transform` fait de la zone l'ancetre des elements `fixed` (fenetres
 * modales, parametres plein ecran) : ils restent sous la barre de titre.
 * Dans un navigateur, ne change rien.
 */
export function DesktopShell({ children }: { children: React.ReactNode }) {
  if (!isDesktopApp) return <>{children}</>;
  return (
    <div className="fixed inset-0 flex flex-col">
      <DesktopTitleBar />
      <div className="desktop-content relative flex-1 min-h-0 overflow-hidden" style={{ transform: 'translateZ(0)' }}>
        {children}
      </div>
    </div>
  );
}
