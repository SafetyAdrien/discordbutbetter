import { MediaEditor, EditorPreviewImage, type MediaEditorResult } from '@/components/ui/media-editor';

interface ServerIconUploadEditorProps {
  open: boolean;
  file: File | null;
  serverName?: string;
  onClose: () => void;
  onFinish: (file: File) => void;
}

/**
 * Server icon editor with a preview of how the icon looks inside the left
 * server rail (small circular tile) and a larger settings preview.
 */
export function ServerIconUploadEditor({
  open,
  file,
  serverName,
  onClose,
  onFinish,
}: ServerIconUploadEditorProps) {
  return (
    <MediaEditor
      open={open}
      file={file}
      title="Edit server icon"
      outputSize={512}
      circular
      onClose={onClose}
      onFinish={(r: MediaEditorResult) => {
        const f = new File(
          [r.blob],
          `server-icon-${Date.now()}.${r.ext}`,
          { type: r.mime }
        );
        onFinish(f);
      }}
      renderPreviews={(t) => (
        <>
          {/* Server list rail preview */}
          <div className="rounded-md bg-muted/40 p-3 w-full">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Server list
            </p>
            <div className="flex items-stretch gap-3">
              <div className="flex flex-col items-center gap-2 py-1 px-2 rounded-md bg-background/70 w-[64px]">
                <EditorPreviewImage t={t} size={48} circular />
                <span className="block w-8 h-1 rounded-full bg-foreground/80" />
              </div>
              <div className="flex flex-col gap-1.5 justify-center">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="w-10 h-10 rounded-full bg-muted" />
              </div>
            </div>
          </div>

          {/* Larger settings preview */}
          <div className="rounded-md bg-muted/40 p-3 w-full">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Server header
            </p>
            <div className="flex items-center gap-3">
              <EditorPreviewImage t={t} size={64} circular />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{serverName || 'My Server'}</p>
                <p className="text-[10px] text-muted-foreground">Online · Public</p>
              </div>
            </div>
          </div>
        </>
      )}
      finishLabel="Save icon"
    />
  );
}
