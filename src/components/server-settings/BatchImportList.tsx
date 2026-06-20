import { CheckCircle2, XCircle, Loader2, Clock, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type BatchItemStatus = 'pending' | 'uploading' | 'success' | 'error';

export interface BatchItem {
  id: string;
  name: string;
  size?: number;
  previewUrl?: string;
  status: BatchItemStatus;
  error?: string;
}

interface BatchImportListProps {
  items: BatchItem[];
  isProcessing: boolean;
  isComplete: boolean;
  onStart: () => void;
  onCancel: () => void;
  onClose: () => void;
  onRetry?: () => void;
  renderPreview?: (item: BatchItem) => React.ReactNode;
}

export function BatchImportList({
  items,
  isProcessing,
  isComplete,
  onStart,
  onCancel,
  onClose,
  onRetry,
  renderPreview,
}: BatchImportListProps) {
  const total = items.length;
  const done = items.filter((i) => i.status === 'success').length;
  const failed = items.filter((i) => i.status === 'error').length;
  const processed = done + failed;
  const progress = total === 0 ? 0 : Math.round((processed / total) * 100);

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">
            {isComplete
              ? 'Récapitulatif de l\'import'
              : isProcessing
              ? `Import en cours… (${processed}/${total})`
              : `${total} fichier${total > 1 ? 's' : ''} sélectionné${total > 1 ? 's' : ''}`}
          </h4>
          {isComplete && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {done} réussi{done > 1 ? 's' : ''} · {failed} échec{failed > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {(isProcessing || isComplete) && (
          <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
        )}
      </div>

      {(isProcessing || isComplete) && <Progress value={progress} className="h-1.5" />}

      <div className="max-h-72 overflow-y-auto space-y-1.5 -mx-1 px-1">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-3 p-2 rounded-md bg-background/60',
              item.status === 'error' && 'bg-destructive/5'
            )}
          >
            <div className="w-9 h-9 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
              {renderPreview ? (
                renderPreview(item)
              ) : item.previewUrl ? (
                <img src={item.previewUrl} alt="" className="w-full h-full object-contain" />
              ) : (
                <FileWarning className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{item.name}</p>
              {item.status === 'error' && item.error && (
                <p className="text-xs text-destructive truncate">{item.error}</p>
              )}
              {item.size !== undefined && item.status !== 'error' && (
                <p className="text-xs text-muted-foreground">
                  {(item.size / 1024).toFixed(1)} Ko
                </p>
              )}
            </div>
            <div className="shrink-0">
              {item.status === 'pending' && <Clock className="w-4 h-4 text-muted-foreground" />}
              {item.status === 'uploading' && (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              )}
              {item.status === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
              {item.status === 'error' && <XCircle className="w-4 h-4 text-destructive" />}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        {isComplete ? (
          <>
            {failed > 0 && onRetry && (
              <Button variant="outline" onClick={onRetry}>
                Réessayer les échecs
              </Button>
            )}
            <Button onClick={onClose}>Fermer</Button>
          </>
        ) : isProcessing ? (
          <Button variant="outline" disabled>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            En cours…
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button onClick={onStart} disabled={total === 0}>
              Importer {total > 0 && `(${total})`}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
