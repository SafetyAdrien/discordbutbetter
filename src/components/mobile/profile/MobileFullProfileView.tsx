import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, X, ExternalLink, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import {
  CONNECTION_PROVIDERS_BY_ID,
  formatConnectionDisplay,
  getConnectionUrl,
  type ProfileConnection,
} from '@/lib/connections';
import { MobileConnectionsManager } from './MobileConnectionsManager';
import { AccountSettingsModal } from '@/components/account-settings/AccountSettingsModal';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

interface Props {
  onBack: () => void;
}

const statusColors: Record<string, string> = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]',
};

export function MobileFullProfileView({ onBack }: Props) {
  const { profile, user } = useAuth();
  const reduced = useReducedMotion();
  const swipe = useSwipeBack({
    onBack: () => {
      haptics.light();
      onBack();
    },
  });
  const [showSettings, setShowSettings] = useState(false);
  const [manageConnections, setManageConnections] = useState(false);

  const initial = profile?.display_name?.charAt(0)?.toUpperCase() || '?';
  const currentStatus = profile?.status || 'offline';
  const connections: ProfileConnection[] = Array.isArray((profile as any)?.connections)
    ? (profile as any).connections
    : [];

  const createdAt = (profile as any)?.created_at || user?.created_at || null;
  const memberSince = createdAt
    ? format(new Date(createdAt), 'd MMMM yyyy', { locale: fr })
    : null;

  return (
    <>
      <motion.div
        initial={reduced ? { opacity: 1 } : { x: '100%' }}
        animate={{ x: 0 }}
        exit={reduced ? { opacity: 1 } : { x: '100%' }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 35 }}
        className="absolute inset-0 z-40 bg-background flex flex-col overflow-hidden"
        {...swipe}
      >
        <div className="flex-1 overflow-y-auto pb-8" style={{ overscrollBehavior: 'contain' }}>
          {/* Banner with X (left) + Gear (right) */}
          <section className="relative">
            {profile?.banner_url ? (
              <div className="h-36 w-full">
                <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className="h-28 w-full"
                style={{
                  background: profile?.theme_color
                    ? `linear-gradient(135deg, ${profile.theme_color}, hsl(var(--primary)))`
                    : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.6))',
                }}
              />
            )}

            {/* Close button */}
            <button
              onClick={() => {
                haptics.light();
                onBack();
              }}
              className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:bg-black/60"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Settings (gear) button */}
            <button
              onClick={() => {
                haptics.light();
                setShowSettings(true);
              }}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:bg-black/60"
              aria-label="Paramètres"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Avatar */}
            <div className="px-4 -mt-12 relative">
              <div className="relative inline-block">
                <Avatar className="w-24 h-24 ring-[5px] ring-background">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-3xl font-semibold">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <StatusIndicator
                  status={currentStatus}
                  className="absolute bottom-1 right-1 w-6 h-6 border-[4px] border-background"
                  bgClassName="bg-background"
                />
              </div>
            </div>
          </section>

          {/* Identity */}
          <section className="mx-4 mt-3 rounded-2xl bg-card border border-border/50 p-4">
            <h2 className="font-bold text-xl truncate">
              {profile?.display_name || 'Utilisateur'}
            </h2>
            <p className="text-sm text-muted-foreground truncate">@{profile?.username}</p>
            {profile?.pronouns && (
              <p className="text-xs text-muted-foreground mt-0.5">{profile.pronouns}</p>
            )}

            {/* Bio */}
            <FieldBlock title="Ma bio">
              {profile?.bio ? (
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Aucune bio renseignée</p>
              )}
            </FieldBlock>

            {/* Member since */}
            <FieldBlock title="Membre depuis">
              <p className="text-sm text-foreground/80">{memberSince ?? '—'}</p>
            </FieldBlock>
          </section>

          {/* Connections */}
          <SectionHeader>Connexions</SectionHeader>
          <section className="mx-4 rounded-2xl bg-card border border-border/50 overflow-hidden">
            {connections.length === 0 ? (
              <div className="px-4 py-5 text-center text-sm text-muted-foreground">
                Aucune connexion ajoutée
              </div>
            ) : (
              connections.map((c, i) => {
                const p = CONNECTION_PROVIDERS_BY_ID[c.provider];
                if (!p) return null;
                const Icon = p.icon;
                const url = getConnectionUrl(c);
                const Wrapper: any = url ? 'a' : 'div';
                const wrapperProps = url
                  ? { href: url, target: '_blank', rel: 'noopener noreferrer' }
                  : {};
                return (
                  <Wrapper
                    key={`${c.provider}-${i}`}
                    {...wrapperProps}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors',
                      i < connections.length - 1 && 'border-b border-border/40',
                    )}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/40">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {formatConnectionDisplay(c)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{p.label}</div>
                    </div>
                    {url && <ExternalLink className="w-4 h-4 text-muted-foreground" />}
                  </Wrapper>
                );
              })
            )}
            <button
              onClick={() => {
                haptics.light();
                setManageConnections(true);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted/40 transition-colors',
                connections.length > 0 && 'border-t border-border/40',
              )}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-primary/15 text-primary">
                <Plus className="w-4 h-4" />
              </div>
              <span className="flex-1 text-left text-sm font-medium">Gérer les connexions</span>
            </button>
          </section>
        </div>

        {showSettings && (
          <AccountSettingsModal onClose={() => setShowSettings(false)} initialTab={null} />
        )}

        {manageConnections && (
          <MobileConnectionsManager onBack={() => setManageConnections(false)} />
        )}
      </motion.div>
    </>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-6 pt-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function FieldBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        {title}
      </div>
      <div className="px-3 py-2.5 rounded-xl bg-muted/40">{children}</div>
    </div>
  );
}
