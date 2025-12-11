import { User } from '@/types/app';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserProfilePopupProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors = {
  online: 'bg-status-online',
  idle: 'bg-status-idle',
  dnd: 'bg-status-dnd',
  offline: 'bg-status-offline',
};

const statusLabels = {
  online: 'En ligne',
  idle: 'Inactif',
  dnd: 'Ne pas déranger',
  offline: 'Hors ligne',
};

export function UserProfilePopup({ user, open, onOpenChange }: UserProfilePopupProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-sm bg-card border-border">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-br from-primary/60 via-glow-purple/40 to-glow-cyan/30" />

        {/* Profile Content */}
        <div className="px-4 pb-4">
          {/* Avatar - positioned to overlap banner */}
          <div className="relative -mt-12 mb-3">
            <div className="relative inline-block">
              <Avatar className="w-20 h-20 border-4 border-card">
                <AvatarImage src={user.avatar} alt={user.displayName} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                  {user.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  'absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-card',
                  statusColors[user.status],
                  user.status === 'online' && 'animate-pulse-ring'
                )}
              />
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-3">
            <div>
              <h3 className="text-xl font-bold text-foreground">{user.displayName}</h3>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 text-sm">
              <div className={cn('w-2.5 h-2.5 rounded-full', statusColors[user.status])} />
              <span className="text-muted-foreground">{statusLabels[user.status]}</span>
            </div>

            {/* Custom Status */}
            {user.customStatus && (
              <p className="text-sm text-foreground/80 italic">"{user.customStatus}"</p>
            )}

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Bio Section */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                À propos de moi
              </h4>
              <p className="text-sm text-foreground/90">
                {user.bio || 'Aucune biographie définie.'}
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button variant="default" size="sm" className="flex-1 gap-2">
                <MessageSquare className="w-4 h-4" />
                Message
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-2">
                <UserPlus className="w-4 h-4" />
                Ajouter
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
