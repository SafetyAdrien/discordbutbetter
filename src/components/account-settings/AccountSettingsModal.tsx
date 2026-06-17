import { useState } from 'react';
import {
  X,
  User,
  Shield,
  Link2,
  AppWindow,
  Smartphone,
  LogOut,
  Palette,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Pencil,
  QrCode,
  Sparkles,
  Bell,
  HelpCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AccountSettings } from './AccountSettings';
import { ProfileSettingsTab } from './ProfileSettingsTab';
import { PrivacySettings } from './PrivacySettings';
import { ConnectionsSettings } from './ConnectionsSettings';
import { AuthorizedAppsSettings } from './AuthorizedAppsSettings';
import { SessionsSettings } from './SessionsSettings';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { uuidToSnowflake } from '@/lib/snowflake';

interface AccountSettingsModalProps {
  onClose: () => void;
  initialTab?: SettingsTab | null;
}

type SettingsTab = 'account' | 'profile' | 'privacy' | 'connections' | 'apps' | 'sessions';

const tabs = [
  { id: 'account' as const, label: 'Mon compte', icon: User },
  { id: 'profile' as const, label: 'Profil', icon: Palette },
  { id: 'privacy' as const, label: 'Confidentialité', icon: Shield },
  { id: 'connections' as const, label: 'Connexions', icon: Link2 },
  { id: 'apps' as const, label: 'Applications autorisées', icon: AppWindow },
  { id: 'sessions' as const, label: 'Sessions actives', icon: Smartphone },
];

export function AccountSettingsModal({ onClose, initialTab }: AccountSettingsModalProps) {
  const { isMobile, isTablet } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<SettingsTab | null>(initialTab !== undefined ? initialTab : (isMobile ? null : 'account'));
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmation === 'SUPPRIMER') {
      toast.info('Fonctionnalité de suppression de compte non implémentée');
      setDeleteDialogOpen(false);
      setDeleteConfirmation('');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'account': return <AccountSettings />;
      case 'profile': return <ProfileSettingsTab />;
      case 'privacy': return <PrivacySettings />;
      case 'connections': return <ConnectionsSettings />;
      case 'apps': return <AuthorizedAppsSettings />;
      case 'sessions': return <SessionsSettings />;
      default: return null;
    }
  };

  const renderNavList = (onSelect: (tab: SettingsTab) => void) => (
    <div className="py-4">
      <div className="px-4 mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Paramètres utilisateur
        </h3>
      </div>
      <nav className="px-2 space-y-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 rounded-2xl text-sm font-medium transition-all duration-300',
                isMobile ? 'py-3' : 'py-2.5',
                activeTab === tab.id
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              style={{ transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)' }}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200',
                activeTab === tab.id ? 'bg-primary/15' : 'bg-muted/50'
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="flex-1 text-left">{tab.label}</span>
              {isMobile && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
          );
        })}
      </nav>

      <div className="px-2 mt-6">
        <div className="h-px bg-border/50 mb-2 mx-2 rounded-full" />
        <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium text-destructive hover:bg-destructive/8 transition-all duration-200">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-destructive/10">
            <LogOut className="w-4 h-4" />
          </div>
          Se déconnecter
        </button>
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium text-destructive/60 hover:bg-destructive/5 transition-all duration-200">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-destructive/5">
                <Trash2 className="w-4 h-4" />
              </div>
              Supprimer mon compte
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer votre compte ?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <span>Cette action est irréversible. Toutes vos données seront définitivement supprimées.</span>
                <div className="pt-2">
                  <Label htmlFor="delete-confirm-sidebar" className="text-sm font-medium">
                    Tapez <span className="font-bold text-destructive">SUPPRIMER</span> pour confirmer
                  </Label>
                  <Input id="delete-confirm-sidebar" className="mt-2 rounded-xl" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder="SUPPRIMER" />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirmation('')} className="rounded-full">Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full" disabled={deleteConfirmation !== 'SUPPRIMER'}>
                Supprimer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  const renderMobileSettingsHome = () => (
    <div className="pb-8">
      <SettingsSection title="Compte">
        <SettingsRow icon={<User className="w-4 h-4 text-muted-foreground" />} label="Mon compte" onClick={() => setActiveTab('account')} />
        <SettingsDivider />
        <SettingsRow icon={<Pencil className="w-4 h-4 text-muted-foreground" />} label="Modifier le profil" onClick={() => setActiveTab('profile')} />
        <SettingsDivider />
        <SettingsRow icon={<QrCode className="w-4 h-4 text-muted-foreground" />} label="Mon code QR" onClick={() => toast.info('Bientôt disponible')} />
        <SettingsDivider />
        <SettingsRow icon={<Link2 className="w-4 h-4 text-muted-foreground" />} label="Connexions" onClick={() => setActiveTab('connections')} />
        <SettingsDivider />
        <SettingsRow icon={<Smartphone className="w-4 h-4 text-muted-foreground" />} label="Sessions actives" onClick={() => setActiveTab('sessions')} />
        <SettingsDivider />
        <SettingsRow icon={<AppWindow className="w-4 h-4 text-muted-foreground" />} label="Applications autorisées" onClick={() => setActiveTab('apps')} />
        <SettingsDivider />
        <SettingsRow icon={<Sparkles className="w-4 h-4 text-muted-foreground" />} label="Boost & avantages" onClick={() => toast.info('Bientôt disponible')} />
      </SettingsSection>

      <SettingsSection title="Préférences">
        <SettingsRow icon={<Bell className="w-4 h-4 text-muted-foreground" />} label="Notifications" onClick={() => toast.info('Bientôt disponible')} />
        <SettingsDivider />
        <SettingsRow icon={<Palette className="w-4 h-4 text-muted-foreground" />} label="Apparence" onClick={() => setActiveTab('profile')} />
        <SettingsDivider />
        <SettingsRow icon={<Shield className="w-4 h-4 text-muted-foreground" />} label="Confidentialité & sécurité" onClick={() => setActiveTab('privacy')} />
      </SettingsSection>

      <SettingsSection title="Support">
        <SettingsRow icon={<HelpCircle className="w-4 h-4 text-muted-foreground" />} label="Aide & FAQ" onClick={() => toast.info('Bientôt disponible')} />
        <SettingsDivider />
        <SettingsRow icon={<Settings className="w-4 h-4 text-muted-foreground" />} label="Paramètres avancés" onClick={() => setActiveTab('account')} />
      </SettingsSection>

      <section className="mx-4 mt-6 rounded-2xl bg-card border border-border/50 overflow-hidden">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium text-destructive active:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </section>

      <p className="text-center text-[11px] text-muted-foreground/60 mt-4 px-4">
        ID · {user?.id ? uuidToSnowflake(user.id) : '—'}
      </p>
    </div>
  );

  // Mobile: 2-level navigation
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {activeTab === null ? (
          <>
            <div className="h-12 px-3 flex items-center gap-2 border-b border-border flex-shrink-0">
              <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-muted/60" aria-label="Fermer">
                <X className="w-5 h-5" />
              </button>
              <h2 className="font-semibold text-base flex-1">Paramètres</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderMobileSettingsHome()}
            </div>
          </>
        ) : (
          <>
            <div className="h-14 px-3 flex items-center gap-2 bg-[hsl(var(--surface-1))] flex-shrink-0 rounded-b-2xl" style={{ boxShadow: 'var(--shadow-elevation-1)' }}>
              <button onClick={() => setActiveTab(null)} className="p-2 rounded-full hover:bg-muted">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="font-semibold text-sm flex-1 truncate">
                {tabs.find(t => t.id === activeTab)?.label}
              </h1>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-2xl">{renderContent()}</div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Desktop / Tablet - Material You elevated panels
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative flex w-full m-auto rounded-3xl overflow-hidden',
          isTablet ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-5xl max-h-[90vh]'
        )}
        style={{ boxShadow: 'var(--shadow-elevation-3)' }}
      >
        <div className={cn(
          'bg-[hsl(var(--surface-1))] flex flex-col border-r border-border/30',
          isTablet ? 'w-52' : 'w-60'
        )}>
          <div className="flex-1 overflow-y-auto">
            {renderNavList((tab) => setActiveTab(tab))}
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
          <div className={cn(
            'flex items-center justify-between border-b border-border/30 flex-shrink-0',
            isTablet ? 'h-12 px-4' : 'h-14 px-6'
          )}>
            <h1 className={cn('font-semibold truncate', isTablet ? 'text-base' : 'text-lg')}>
              {tabs.find(t => t.id === activeTab)?.label}
            </h1>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-all duration-200 shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className={cn('flex-1 overflow-y-auto', isTablet ? 'p-4' : 'p-6')}>
            <div className="max-w-2xl">{renderContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h3 className="px-6 pt-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <section className="mx-4 rounded-2xl bg-card border border-border/50 overflow-hidden">
        {children}
      </section>
    </>
  );
}

function SettingsDivider() {
  return <div className="h-px bg-border/40 mx-4" />;
}

function SettingsRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted/40 transition-colors"
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/40">{icon}</div>
      <div className="flex-1 text-left text-sm font-medium">{label}</div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}
