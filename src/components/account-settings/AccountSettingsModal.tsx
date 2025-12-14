import { useState } from 'react';
import { X, User, Shield, Link2, AppWindow, Smartphone, LogOut, Palette, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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

interface AccountSettingsModalProps {
  onClose: () => void;
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

export function AccountSettingsModal({ onClose }: AccountSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const { signOut } = useAuth();

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
      case 'account':
        return <AccountSettings />;
      case 'profile':
        return <ProfileSettingsTab />;
      case 'privacy':
        return <PrivacySettings />;
      case 'connections':
        return <ConnectionsSettings />;
      case 'apps':
        return <AuthorizedAppsSettings />;
      case 'sessions':
        return <SessionsSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      {/* Sidebar */}
      <div className="w-56 bg-card flex flex-col border-r border-border">
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Paramètres utilisateur
            </h3>
          </div>
          
          <nav className="px-2 space-y-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="px-2 mt-6">
            <div className="h-px bg-border mb-2" />
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </button>
            
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer mon compte
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer votre compte ?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4">
                    <span>
                      Cette action est irréversible. Toutes vos données seront définitivement supprimées.
                    </span>
                    <div className="pt-2">
                      <Label htmlFor="delete-confirm-sidebar" className="text-sm font-medium">
                        Tapez <span className="font-bold text-destructive">SUPPRIMER</span> pour confirmer
                      </Label>
                      <Input
                        id="delete-confirm-sidebar"
                        className="mt-2"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="SUPPRIMER"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                    Annuler
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteAccount} 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteConfirmation !== 'SUPPRIMER'}
                  >
                    Supprimer définitivement
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-border flex-shrink-0">
          <h1 className="text-lg font-semibold">
            {tabs.find(t => t.id === activeTab)?.label}
          </h1>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
