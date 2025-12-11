import { useState, useRef } from 'react';
import { useServerEmojis, useUploadEmoji, useDeleteEmoji } from '@/hooks/useServerAssets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, Upload, Smile } from 'lucide-react';

interface EmojiManagerProps {
  serverId: string;
}

export function EmojiManager({ serverId }: EmojiManagerProps) {
  const { data: emojis = [], isLoading } = useServerEmojis(serverId);
  const uploadEmoji = useUploadEmoji();
  const deleteEmoji = useDeleteEmoji();

  const [showUpload, setShowUpload] = useState(false);
  const [emojiName, setEmojiName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      if (!emojiName) {
        setEmojiName(file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_'));
      }
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !emojiName.trim()) return;

    uploadEmoji.mutate(
      { serverId, name: emojiName.trim(), file: selectedFile },
      {
        onSuccess: () => {
          setShowUpload(false);
          setEmojiName('');
          setSelectedFile(null);
          setPreviewUrl(null);
        },
      }
    );
  };

  const handleDelete = (emojiId: string) => {
    deleteEmoji.mutate({ emojiId, serverId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Emojis personnalisés</h4>
          <p className="text-sm text-muted-foreground">{emojis.length} emojis</p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="p-4 rounded-lg bg-muted/50 space-y-4">
          <div className="flex items-start gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center transition-colors"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-16 h-16 object-contain" />
              ) : (
                <Upload className="w-6 h-6 text-muted-foreground" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="emoji-name">Nom de l'emoji</Label>
              <Input
                id="emoji-name"
                value={emojiName}
                onChange={(e) => setEmojiName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))}
                placeholder="mon_emoji"
                maxLength={32}
              />
              <p className="text-xs text-muted-foreground">
                Utilisez seulement des lettres, chiffres et underscores
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowUpload(false);
                setEmojiName('');
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !emojiName.trim() || uploadEmoji.isPending}
            >
              {uploadEmoji.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Téléchargement...
                </>
              ) : (
                'Télécharger'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Emoji Grid */}
      {emojis.length === 0 ? (
        <div className="text-center py-12">
          <Smile className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium">Aucun emoji</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ajoutez des emojis personnalisés pour votre serveur
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {emojis.map((emoji) => (
            <div
              key={emoji.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 group"
            >
              <img
                src={emoji.image_url}
                alt={emoji.name}
                className="w-10 h-10 object-contain"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">:{emoji.name}:</p>
              </div>
              <button
                onClick={() => handleDelete(emoji.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-destructive transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
