import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, Edit, ChevronRight, Circle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface MobileProfileViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings: () => void;
}

const statusOptions = [
  { value: 'online', label: 'En ligne', color: 'hsl(var(--online))' },
  { value: 'idle', label: 'Inactif', color: 'hsl(var(--idle))' },
  { value: 'dnd', label: 'Ne pas déranger', color: 'hsl(var(--dnd))' },
  { value: 'offline', label: 'Invisible', color: 'hsl(var(--offline))' },
] as const;

export function MobileProfileView({ open, onOpenChange, onOpenSettings }: MobileProfileViewProps) {
  const navigate = useNavigate();
  const { user, profile, signOut, updateStatus } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>(profile?.status || 'online');

  const handleStatusChange = async (status: string) => {
    setSelectedStatus(status);
    await updateStatus?.(status as 'online' | 'idle' | 'dnd' | 'offline');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleOpenSettings = () => {
    onOpenChange(false);
    onOpenSettings();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
          <ScrollArea className="h-full">
            {/* Banner */}
            <div 
              className="h-24 relative"
              style={{
                background: profile?.banner_url 
                  ? `url(${profile.banner_url}) center/cover`
                  : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.6) 100%)'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>

            {/* Avatar & Name */}
            <div className="px-6 -mt-12 relative">
              <div className="flex items-end gap-4">
                <div className="relative">
                  <Avatar className="w-20 h-20 border-4 border-background">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {profile?.display_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {/* Status indicator */}
                  <div 
                    className="absolute bottom-1 right-1 w-5 h-5 rounded-full border-3 border-background"
                    style={{ 
                      backgroundColor: statusOptions.find(s => s.value === selectedStatus)?.color || 'hsl(var(--offline))'
                    }}
                  />
                </div>
                <div className="pb-2 flex-1 min-w-0">
                  <h2 className="text-xl font-semibold truncate">
                    {profile?.display_name || 'Utilisateur'}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">
                    @{profile?.username?.toLowerCase() || 'utilisateur'}
                  </p>
                </div>
              </div>

              {/* Custom Status */}
              {profile?.custom_status && (
                <div className="mt-4 px-3 py-2 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{profile.custom_status}</p>
                </div>
              )}

              {/* Bio */}
              {profile?.bio && (
                <div className="mt-4">
                  <p className="text-sm text-foreground/80">{profile.bio}</p>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Status Selector */}
            <div className="px-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Statut
              </h3>
              <div className="space-y-1">
                {statusOptions.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => handleStatusChange(status.value)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-[44px]",
                      selectedStatus === status.value 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-muted/50"
                    )}
                  >
                    <Circle 
                      className="w-4 h-4" 
                      fill={status.color}
                      stroke={status.color}
                    />
                    <span className="font-medium">{status.label}</span>
                    {selectedStatus === status.value && (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Actions */}
            <div className="px-6 pb-8 space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-12"
                onClick={handleOpenSettings}
              >
                <Edit className="w-5 h-5" />
                Modifier le profil
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-12"
                onClick={handleOpenSettings}
              >
                <Settings className="w-5 h-5" />
                Paramètres du compte
              </Button>

              <Separator className="my-4" />

              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowLogoutDialog(true)}
              >
                <LogOut className="w-5 h-5" />
                Se déconnecter
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Logout Confirmation */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir vous déconnecter de votre compte ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Se déconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
