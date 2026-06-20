import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface UploadingOverlayProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
}

export function UploadingOverlay({
  open,
  onClose,
  title = 'Uploading…',
  subtitle = 'Your files are being prepared. Please wait.',
}: UploadingOverlayProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border/60 [&>button]:hidden">
        <div className="relative p-6 pr-12">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center justify-center py-10">
            <div className="relative w-10 h-10">
              <span className="absolute inset-0 animate-spin">
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-primary rounded-[2px]" />
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-primary/70 rounded-[2px]" />
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
