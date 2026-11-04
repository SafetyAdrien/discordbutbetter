import { useState } from 'react';
import { ImagePlay, UserCircle, Play } from 'lucide-react';
import { Smile, Sparkles, Headphones, MonitorPlay, Upload, Image as ImageIcon, Star } from '@/components/icons/discord/lucide';
import { X, Gem } from '@/components/icons/serverSettingsIcons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { userKey } from '@/lib/userScope';

/*
 * "Boosts de serveur" (video de reference) : niveaux 1 a 3 avec leurs
 * avantages, "Avantages supplementaires", et la colonne de droite (compteurs,
 * "Booster ce serveur", avertissement). L'app n'a pas de systeme de boost :
 * les compteurs restent a 0 et l'achat est "Bientot disponible".
 * `layout="main"` : page pleine largeur ouverte depuis la liste des salons.
 */

interface BoostBenefitsPageProps {
  serverId: string;
  layout?: 'settings' | 'main';
}

const TIERS = [
  {
    level: 1,
    boosts: 2,
    perks: [
      { icon: Smile, text: "100 emplacements d'émojis" },
      { icon: Sparkles, text: '24 emplacements de Soundboard' },
      { icon: ImagePlay, text: 'Icône de serveur animée' },
      { icon: Headphones, text: 'Meilleure qualité audio' },
    ],
  },
  {
    level: 2,
    boosts: 5,
    perks: [
      { icon: MonitorPlay, text: 'Streaming haute définition' },
      { icon: Upload, text: "Jusqu'à 50 Mo d'uploads de fichier" },
      { icon: UserCircle, text: 'Icônes de rôle personnalisées' },
      { icon: ImageIcon, text: 'Bannière du serveur' },
    ],
  },
  {
    level: 3,
    boosts: 7,
    perks: [
      { icon: Star, text: "Lien d'invitation au serveur personnalisé" },
      { icon: Upload, text: "Jusqu'à 100 Mo d'uploads de fichier" },
      { icon: Headphones, text: 'Qualité audio maximale' },
      { icon: ImagePlay, text: 'Bannière de serveur animée' },
    ],
  },
];

const EXTRAS = [
  {
    title: 'Tag du serveur',
    text: 'Laisse tes membres représenter ton serveur partout dans l\'app.',
    boosts: 3,
    art: (
      <div className="flex flex-col items-center gap-1 -rotate-6">
        <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#5865f2] to-[#9b59ff] text-lg font-black text-white shadow-lg">✦ POLR</span>
        <span className="-mt-1 -ml-10 px-3 py-1 rounded-lg bg-gradient-to-r from-[#eb459e] to-[#ff73fa] text-lg font-black text-white shadow-lg">♥ GGEZ</span>
      </div>
    ),
  },
  {
    title: 'Packs de badges de tag de serveur',
    text: 'Démarque-toi avec des packs de badges spéciaux et thématiques pour ton tag de serveur.',
    boosts: 3,
    art: <span className="text-4xl font-black tracking-tight text-white drop-shadow">🐕 B0RK</span>,
  },
  {
    title: 'Styles de rôles améliorés',
    text: 'Donne à certains rôles la possibilité de se démarquer avec des dégradés animés et colorés.',
    boosts: 3,
    art: <span className="text-4xl font-black bg-gradient-to-r from-[#ff73fa] to-[#ff4fb7] bg-clip-text text-transparent">Wumpus</span>,
  },
];

const BOOST_PINK = 'text-[#ff73fa]';
const ADS_KEY = 'boosts:warning-hidden';

function SoonTooltip({ children }: { children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent><p>Bientôt disponible</p></TooltipContent>
    </Tooltip>
  );
}

export function BoostBenefitsPage({ layout = 'settings' }: BoostBenefitsPageProps) {
  const boostCount = 0;
  const [warningHidden, setWarningHidden] = useState(() => {
    try {
      return localStorage.getItem(userKey(ADS_KEY)) === '1';
    } catch {
      return false;
    }
  });

  const side = (
    <aside className={cn('space-y-6', layout === 'main' ? 'w-full xl:w-[310px] shrink-0' : 'w-full')}>
      <div>
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-white">Boosts de serveur</p>
          <SoonTooltip><span className="text-sm text-[hsl(var(--text-link))] cursor-default">En savoir plus</span></SoonTooltip>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {[
            ['Disponible(s)', true],
            ['Dépensé(s)', false],
            ['Total', false],
          ].map(([label, pink]) => (
            <div key={label as string} className="py-3 rounded-lg bg-[hsl(var(--surface-card))] text-center">
              <p className="flex items-center justify-center gap-1 text-xl font-semibold text-white">
                <Gem className={cn('w-4 h-4', pink ? BOOST_PINK : 'text-[hsl(var(--icon-default))]')} />
                {boostCount}
              </p>
              <p className="text-sm text-foreground">{label as string}</p>
            </div>
          ))}
        </div>
        <SoonTooltip>
          <span className="mt-2 flex items-center justify-center gap-2 h-11 rounded-lg bg-[hsl(var(--surface-card))] text-base font-medium text-white/60 cursor-not-allowed">
            <Gem className={cn('w-4 h-4', BOOST_PINK)} /> Booster ce serveur
          </span>
        </SoonTooltip>
      </div>
      {!warningHidden && (
        <div>
          <p className="text-lg font-semibold text-white">Avertissements</p>
          <div className="mt-3 rounded-lg bg-[hsl(var(--surface-card))] p-2 pb-4">
            <div className="relative h-[164px] rounded-lg overflow-hidden bg-gradient-to-br from-[#2b1f6e] via-[#4b2fa8] to-[#c13f9b] flex items-center justify-center">
              <Gem className="absolute top-6 w-14 h-14 text-[#ff73fa] drop-shadow-[0_0_20px_rgba(255,115,250,0.7)]" />
              <span className="mt-10 w-11 h-11 rounded-full bg-black/40 flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-white" />
              </span>
              <button
                type="button"
                aria-label="Masquer"
                onClick={() => {
                  setWarningHidden(true);
                  try {
                    localStorage.setItem(userKey(ADS_KEY), '1');
                  } catch {
                    /* stockage indisponible */
                  }
                }}
                className="absolute top-2 right-2 p-1 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-4 text-center text-base font-semibold text-white">Comment fonctionnent les boosts ?</p>
            <p className="mt-1 px-2 text-center text-sm text-foreground">
              Les membres de ce serveur peuvent payer pour le booster, et les administrateurs peuvent utiliser ces boosts pour déverrouiller de nouvelles fonctionnalités.
            </p>
          </div>
        </div>
      )}
    </aside>
  );

  return (
    <div className={cn(layout === 'main' ? 'flex flex-col xl:flex-row gap-8 items-start max-w-[1180px]' : 'space-y-8')}>
      <div className="flex-1 min-w-0 space-y-8">
        {layout === 'settings' && (
          <div>
            <h2 className="text-xl font-semibold leading-6 text-white">Avantages de boost</h2>
            <p className="mt-1 text-sm leading-[18px] text-foreground">Débloque des fonctionnalités exclusives en boostant ce serveur.</p>
          </div>
        )}
        <section>
          <h3 className="text-xl font-semibold text-white">Niveaux</h3>
          <p className="mt-1 text-sm text-foreground">Ton serveur va automatiquement « passer au niveau supérieur » une fois qu'il aura assez de boosts disponibles.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {TIERS.map((t) => (
              <div key={t.level} className="rounded-xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-subtle))] p-4 flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[hsl(var(--button-secondary))] flex items-center justify-center">
                    <Gem className="w-4 h-4 text-[hsl(var(--icon-default))]" />
                  </span>
                  <span className="flex-1 h-1 rounded-full bg-[hsl(var(--button-secondary))]" />
                </div>
                <p className="mt-4 text-base font-semibold text-white">Niveau {t.level}</p>
                <ul className="mt-3 space-y-2 flex-1">
                  {t.perks.map((p) => (
                    <li key={p.text} className="flex items-start gap-2 text-sm text-foreground">
                      <p.icon className="w-4 h-4 mt-0.5 shrink-0 text-[hsl(var(--icon-default))]" />
                      {p.text}
                    </li>
                  ))}
                  <li className="text-sm text-foreground">… et bien plus !</li>
                </ul>
                <p className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-white">
                  <Gem className={cn('w-4 h-4', BOOST_PINK)} /> {t.boosts} boosts
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="pt-6 border-t border-[hsl(var(--border-subtle))]">
          <h3 className="text-xl font-semibold text-white">Avantages supplémentaires</h3>
          <p className="mt-1 text-sm text-foreground">Des avantages individuels pouvant être déverrouillés en utilisant les Boosts disponibles. Aucun niveau requis.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {EXTRAS.map((x) => (
              <div key={x.title} className="group rounded-xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-subtle))] overflow-hidden flex flex-col">
                <div className="h-[150px] bg-[hsl(var(--card))] flex items-center justify-center">{x.art}</div>
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-base font-semibold text-white">{x.title}</p>
                  <p className="mt-1 text-sm text-foreground flex-1">{x.text}</p>
                  <p className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-white">
                    <Gem className={cn('w-4 h-4', BOOST_PINK)} /> {x.boosts} boosts
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      {side}
    </div>
  );
}
