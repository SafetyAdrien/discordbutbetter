import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile, X, Gamepad2, Headphones, Eye, Trophy } from 'lucide-react';
import { useUpdateProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface CustomStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTIVITY_TYPES = [
  { value: 'playing', label: 'Joue à', icon: Gamepad2, color: 'text-violet-400' },
  { value: 'listening', label: 'Écoute', icon: Headphones, color: 'text-green-400' },
  { value: 'watching', label: 'Regarde', icon: Eye, color: 'text-red-400' },
  { value: 'competing', label: 'En compétition', icon: Trophy, color: 'text-yellow-400' },
];

const DURATION_OPTIONS = [
  { value: '30m', label: '30 minutes' },
  { value: '1h', label: '1 heure' },
  { value: '4h', label: '4 heures' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'never', label: 'Ne pas effacer' },
];

const COMMON_EMOJIS = ['😀', '😎', '🎮', '🎧', '📺', '🏆', '💤', '🔥', '💻', '📚', '🎬', '🎵', '⚡', '🌙', '☕', '🍕'];

export function CustomStatusModal({ open, onOpenChange }: CustomStatusModalProps) {
  const { profile } = useAuth();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  
  const [statusEmoji, setStatusEmoji] = useState('');
  const [statusText, setStatusText] = useState('');
  const [activityType, setActivityType] = useState<string>('');
  const [activityText, setActivityText] = useState('');
  const [duration, setDuration] = useState('never');

  // Load current status on open
  useEffect(() => {
    if (open && profile) {
      setStatusText(profile.custom_status || '');
      setActivityType(profile.activity_type || '');
      setActivityText(profile.activity_text || '');
    }
  }, [open, profile]);

  const handleSave = () => {
    const customStatus = statusEmoji && statusText 
      ? `${statusEmoji} ${statusText}` 
      : statusEmoji || statusText || null;

    updateProfile({
      custom_status: customStatus,
      activity_type: activityType || null,
      activity_text: activityText || null,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleClear = () => {
    setStatusEmoji('');
    setStatusText('');
    setActivityType('');
    setActivityText('');
    
    updateProfile({
      custom_status: null,
      activity_type: null,
      activity_text: null,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const hasStatus = statusEmoji || statusText;
  const selectedActivity = ACTIVITY_TYPES.find(a => a.value === activityType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle>Définir un statut personnalisé</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Input Zone */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Statut</Label>
            <div className="flex items-center gap-2 bg-background rounded-md border border-input p-1">
              {/* Emoji Picker Button */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 flex-shrink-0"
                  >
                    {statusEmoji ? (
                      <span className="text-lg">{statusEmoji}</span>
                    ) : (
                      <Smile className="w-5 h-5 text-muted-foreground" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="grid grid-cols-8 gap-1">
                    {COMMON_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setStatusEmoji(emoji)}
                        className="text-xl p-1 hover:bg-muted rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Status Text Input */}
              <Input
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="Quel est ton statut ?"
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
                maxLength={128}
              />

              {/* Clear Button */}
              {hasStatus && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setStatusEmoji('');
                    setStatusText('');
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Activity Type Selector */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Type d'activité</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Sélectionner une activité">
                  {selectedActivity && (
                    <div className="flex items-center gap-2">
                      <selectedActivity.icon className={cn("w-4 h-4", selectedActivity.color)} />
                      <span>{selectedActivity.label}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  <span className="text-muted-foreground">Aucune activité</span>
                </SelectItem>
                {ACTIVITY_TYPES.map((activity) => (
                  <SelectItem key={activity.value} value={activity.value}>
                    <div className="flex items-center gap-2">
                      <activity.icon className={cn("w-4 h-4", activity.color)} />
                      <span>{activity.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Activity Name Input (conditional) */}
            {activityType && (
              <Input
                value={activityText}
                onChange={(e) => setActivityText(e.target.value)}
                placeholder={
                  activityType === 'playing' ? 'Nom du jeu...' :
                  activityType === 'listening' ? 'Nom de la musique/artiste...' :
                  activityType === 'watching' ? 'Nom du film/série...' :
                  activityType === 'competing' ? 'Nom de la compétition...' :
                  'Détails...'
                }
                className="bg-background mt-2"
                maxLength={128}
              />
            )}
          </div>

          {/* Duration Selector */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Effacer après</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button 
            variant="ghost" 
            onClick={handleClear}
            disabled={isPending}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Effacer le statut
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
