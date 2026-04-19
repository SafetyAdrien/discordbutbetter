import { useState, useRef } from 'react';
import { useServerStickers, useUploadSticker, useDeleteSticker } from '@/hooks/useServerAssets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Loader2, Upload, Sticker } from 'lucide-react';

interface StickerManagerProps {
  serverId: string;
}

export function StickerManager({ serverId }: StickerManagerProps) {
  const { data: stickers = [], isLoading } = useServerStickers(serverId);
  const uploadSticker = useUploadSticker();
  const deleteSticker = useDeleteSticker();

  const [showUpload, setShowUpload] = useState(false);
  const [stickerName, setStickerName] = useState('');
  const [stickerDescription, setStickerDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      if (!stickerName) {
        setStickerName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !stickerName.trim()) return;

    uploadSticker.mutate(
      { serverId, name: stickerName.trim(), description: stickerDescription, file: selectedFile },
      {
        onSuccess: () => {
          setShowUpload(false);
          setStickerName('');
          setStickerDescription('');
          setSelectedFile(null);
          setPreviewUrl(null);
        },
      }
    );
  };

  const handleDelete = (stickerId: string) => {
    deleteSticker.mutate({ stickerId, serverId });
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
          <h4 className="text-sm font-medium">Stickers personnalisés</h4>
          <p className="text-sm text-muted-foreground">{stickers.length} stickers</p>
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
              className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center transition-colors flex-shrink-0"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-20 h-20 object-contain" />
              ) : (
                <Upload className="w-6 h-6 text-muted-foreground" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/gif,image/webp,image/apng"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="sticker-name">Nom du sticker</Label>
                <Input
                  id="sticker-name"
                  value={stickerName}
                  onChange={(e) => setStickerName(e.target.value)}
                  placeholder="Mon sticker"
                  maxLength={30}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sticker-description">Description (optionnel)</Label>
                <Textarea
                  id="sticker-description"
                  value={stickerDescription}
                  onChange={(e) => setStickerDescription(e.target.value)}
                  placeholder="Décrivez ce sticker..."
                  rows={2}
                  maxLength={100}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowUpload(false);
                setStickerName('');
                setStickerDescription('');
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !stickerName.trim() || uploadSticker.isPending}
            >
              {uploadSticker.isPending ? (
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

      {/* Sticker Grid */}
      {stickers.length === 0 ? (
        <div className="text-center py-12">
          <Sticker className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium">Aucun sticker</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ajoutez des stickers personnalisés pour votre serveur
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {stickers.map((sticker) => (
            <div
              key={sticker.id}
              className="p-4 rounded-lg bg-muted/30 group relative"
            >
              <img
                src={sticker.url}
                alt={sticker.name}
                className="w-full aspect-square object-contain mb-2"
              />
              <p className="text-sm font-medium truncate">{sticker.name}</p>
              {sticker.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {sticker.description}
                </p>
              )}
              <button
                onClick={() => handleDelete(sticker.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-background/80 hover:text-destructive transition-all"
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
