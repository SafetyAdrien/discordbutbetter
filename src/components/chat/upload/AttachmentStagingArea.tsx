import { useState } from 'react';
import { Eye, EyeOff, Pencil, Trash2, FileText } from 'lucide-react';
import { PendingAttachment } from '@/hooks/usePendingAttachments';
import { AttachmentEditModal } from './AttachmentEditModal';
import { cn } from '@/lib/utils';

interface AttachmentStagingAreaProps {
  attachments: PendingAttachment[];
  onToggleSpoiler: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<PendingAttachment, 'name' | 'description' | 'isSpoiler'>>) => void;
}

export function AttachmentStagingArea({
  attachments,
  onToggleSpoiler,
  onRemove,
  onUpdate,
}: AttachmentStagingAreaProps) {
  const [editingAttachment, setEditingAttachment] = useState<PendingAttachment | null>(null);

  if (attachments.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 px-4 pb-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="relative group rounded-lg overflow-hidden bg-surface border border-border/50"
          >
            {/* Thumbnail */}
            <div className="relative w-[120px] h-[120px]">
              {attachment.file.type.startsWith('video/') ? (
                <video
                  src={attachment.previewUrl}
                  className={cn(
                    "w-full h-full object-cover",
                    attachment.isSpoiler && "blur-xl"
                  )}
                  muted
                />
              ) : attachment.file.type === 'application/pdf' ? (
                <div
                  className={cn(
                    "w-full h-full flex flex-col items-center justify-center gap-1 bg-muted",
                    attachment.isSpoiler && "blur-xl"
                  )}
                >
                  <FileText className="w-10 h-10 text-destructive" strokeWidth={1.5} />
                  <span className="text-[10px] font-bold text-muted-foreground tracking-wider">PDF</span>
                </div>
              ) : (
                <img
                  src={attachment.previewUrl}
                  alt={attachment.name}
                  className={cn(
                    "w-full h-full object-cover",
                    attachment.isSpoiler && "blur-xl"
                  )}
                />
              )}
              
              {/* Spoiler overlay text */}
              {attachment.isSpoiler && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">
                    Spoiler
                  </span>
                </div>
              )}

              {/* ALT badge - shown when description exists */}
              {attachment.description && (
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-white rounded text-[10px] font-bold text-black">
                  ALT
                </div>
              )}

              {/* Toolbar - appears on hover */}
              <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 rounded-md p-0.5">
                {/* Spoiler toggle */}
                <button
                  type="button"
                  onClick={() => onToggleSpoiler(attachment.id)}
                  className={cn(
                    "p-1.5 rounded hover:bg-white/10 transition-colors",
                    attachment.isSpoiler && "text-[#5865f2]"
                  )}
                  title={attachment.isSpoiler ? "Retirer le spoiler" : "Marquer comme spoiler"}
                >
                  {attachment.isSpoiler ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                
                {/* Edit */}
                <button
                  type="button"
                  onClick={() => setEditingAttachment(attachment)}
                  className="p-1.5 rounded hover:bg-white/10 transition-colors"
                  title="Modifier"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                
                {/* Delete */}
                <button
                  type="button"
                  onClick={() => onRemove(attachment.id)}
                  className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filename */}
            <div className="px-2 py-1.5 bg-surface-elevated">
              <p className="text-xs text-muted-foreground truncate max-w-[104px]" title={attachment.name}>
                {attachment.name}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      <AttachmentEditModal
        attachment={editingAttachment}
        open={!!editingAttachment}
        onOpenChange={(open) => !open && setEditingAttachment(null)}
        onSave={(updates) => {
          if (editingAttachment) {
            onUpdate(editingAttachment.id, updates);
            setEditingAttachment(null);
          }
        }}
      />
    </>
  );
}
