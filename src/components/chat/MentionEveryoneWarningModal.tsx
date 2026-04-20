import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AtSign } from 'lucide-react';

export type EveryoneMentionType = 'everyone' | 'here' | 'both';

interface MentionEveryoneWarningModalProps {
  open: boolean;
  mentionType: EveryoneMentionType;
  onConfirm: () => void;
  onEdit: () => void;
}

const TITLES: Record<EveryoneMentionType, string> = {
  everyone: 'Mentionner @everyone ?',
  here: 'Mentionner @here ?',
  both: 'Mentionner tout le monde ?',
};

export function MentionEveryoneWarningModal({
  open,
  mentionType,
  onConfirm,
  onEdit,
}: MentionEveryoneWarningModalProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        className="max-w-md"
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          onEdit();
        }}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/15 text-warning flex items-center justify-center flex-shrink-0">
              <AtSign className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-base">
              {TITLES[mentionType]}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2 text-sm leading-relaxed">
            Tu es sur le point de mentionner tout un groupe de personnes. Souhaites-tu
            vraiment envoyer ou modifier ton message&nbsp;?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onEdit}>Modifier le message</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Publier</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Detects whether the given content contains @everyone or @here mentions.
 * Returns the mention type (or null if none).
 */
export function detectEveryoneMention(content: string): EveryoneMentionType | null {
  const hasEveryone = /\B@everyone\b/.test(content);
  const hasHere = /\B@here\b/.test(content);
  if (hasEveryone && hasHere) return 'both';
  if (hasEveryone) return 'everyone';
  if (hasHere) return 'here';
  return null;
}
