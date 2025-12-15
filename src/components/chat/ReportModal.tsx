import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { Message } from '@/types/app';

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam', description: 'Messages indésirables ou répétitifs' },
  { id: 'harassment', label: 'Harcèlement', description: 'Comportement abusif ou intimidant' },
  { id: 'hate_speech', label: 'Discours haineux', description: 'Propos discriminatoires ou offensants' },
  { id: 'violence', label: 'Violence', description: 'Menaces ou incitation à la violence' },
  { id: 'nsfw', label: 'Contenu inapproprié', description: 'Contenu explicite ou inapproprié' },
  { id: 'misinformation', label: 'Désinformation', description: 'Informations fausses ou trompeuses' },
  { id: 'other', label: 'Autre', description: 'Autre raison de signalement' },
];

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  onSubmit: (reasonId: string, details: string) => void;
}

export function ReportModal({ isOpen, onClose, message, onSubmit }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    
    setIsSubmitting(true);
    await onSubmit(selectedReason, details);
    setIsSubmitting(false);
    
    // Reset state
    setSelectedReason('');
    setDetails('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setSelectedReason('');
      setDetails('');
    }
  };

  if (!message) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Signaler ce message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message Preview */}
          <div className="p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={message.author.avatar} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {message.author.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm text-foreground">
                  {message.author.displayName}
                </span>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                  {message.content}
                </p>
              </div>
            </div>
          </div>

          {/* Report Reasons */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sélectionnez un motif :</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <div
                  key={reason.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedReason(reason.id)}
                >
                  <RadioGroupItem value={reason.id} id={reason.id} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={reason.id} className="font-medium cursor-pointer">
                      {reason.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {reason.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Additional Details */}
          <div className="space-y-2">
            <Label htmlFor="details" className="text-sm font-medium">
              Détails supplémentaires (optionnel)
            </Label>
            <Textarea
              id="details"
              placeholder="Ajoutez du contexte pour nous aider à comprendre le problème..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting}
          >
            {isSubmitting ? 'Envoi...' : 'Signaler'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
