import { MediaEditor, EditorPreviewImage, type MediaEditorResult } from '@/components/ui/media-editor';
import { useAuth } from '@/contexts/AuthContext';

interface AvatarUploadEditorProps {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onFinish: (file: File) => void;
}

/**
 * Avatar editor with previews reproducing how the avatar appears across the
 * app: member list, DM list and the bottom-left profile chip.
 */
export function AvatarUploadEditor({ open, file, onClose, onFinish }: AvatarUploadEditorProps) {
  const { profile } = useAuth();
  const username = profile?.display_name || profile?.username || 'You';

  return (
    <MediaEditor
      open={open}
      file={file}
      title="Edit avatar"
      outputSize={512}
      circular
      onClose={onClose}
      onFinish={(r: MediaEditorResult) => {
        const f = new File(
          [r.blob],
          `avatar-${Date.now()}.${r.ext}`,
          { type: r.mime }
        );
        onFinish(f);
      }}
      renderPreviews={(t) => (
        <>
          {/* Bottom-left profile chip */}
          <div className="rounded-md bg-muted/40 p-2 w-full">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Bottom bar
            </p>
            <div className="flex items-center gap-2 rounded-md bg-background/70 p-1.5">
              <div className="relative shrink-0">
                <EditorPreviewImage t={t} size={32} circular />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{username}</p>
                <p className="text-[10px] text-muted-foreground">Online</p>
              </div>
            </div>
          </div>

          {/* Member list row */}
          <div className="rounded-md bg-muted/40 p-2 w-full">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Member list
            </p>
            <div className="flex items-center gap-2 px-1.5 py-1 rounded">
              <div className="relative shrink-0">
                <EditorPreviewImage t={t} size={28} circular />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              <span className="text-sm truncate">{username}</span>
            </div>
          </div>

          {/* DM list row */}
          <div className="rounded-md bg-muted/40 p-2 w-full">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Direct messages
            </p>
            <div className="flex items-center gap-2 px-1.5 py-1.5 rounded bg-background/70">
              <EditorPreviewImage t={t} size={32} circular />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{username}</p>
                <p className="text-[10px] text-muted-foreground truncate">You: hey 👋</p>
              </div>
            </div>
          </div>
        </>
      )}
      finishLabel="Save avatar"
    />
  );
}
