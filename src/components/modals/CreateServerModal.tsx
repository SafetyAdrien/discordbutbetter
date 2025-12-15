import { useState, useCallback } from 'react';
import { X, Camera, ChevronRight, ArrowLeft, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JoinServerModal } from './JoinServerModal';
import { ImageCropper } from '@/components/ui/image-cropper';
import { supabase } from '@/integrations/supabase/client';

interface CreateServerModalProps {
  onClose: () => void;
  onCreate: (name: string, iconUrl: string | null, bannerUrl?: string | null, templateId?: string | null) => void;
  onDiscoverClick?: () => void;
}

const templates = [
  { id: 'gaming', name: 'Gaming', icon: '🎮', description: 'Pour les communautés de joueurs' },
  { id: 'friends', name: 'Amis', icon: '💗', description: 'Un espace pour votre groupe d\'amis' },
  { id: 'study', name: 'Groupe d\'étude', icon: '🍎', description: 'Pour les projets éducatifs' },
  { id: 'school', name: 'Club Scolaire', icon: '📚', description: 'Pour les associations étudiantes' },
];

export function CreateServerModal({ onClose, onCreate, onDiscoverClick }: CreateServerModalProps) {
  const [serverName, setServerName] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [step, setStep] = useState<'choice' | 'type' | 'customize' | 'join'>('choice');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Cropper states
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState<string>('');
  const [cropperType, setCropperType] = useState<'icon' | 'banner'>('icon');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropperImage(reader.result as string);
        setCropperType(type);
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleCropComplete = useCallback((croppedBlob: Blob) => {
    const file = new File([croppedBlob], `${cropperType}-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const url = URL.createObjectURL(croppedBlob);
    
    if (cropperType === 'icon') {
      setIconFile(file);
      setIconPreview(url);
    } else {
      setBannerFile(file);
      setBannerPreview(url);
    }
  }, [cropperType]);

  const handleRemoveIcon = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIconFile(null);
    setIconPreview(null);
  };

  const handleRemoveBanner = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBannerFile(null);
    setBannerPreview(null);
  };

  const uploadToStorage = async (file: File, bucket: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `temp/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleCreate = async () => {
    if (!serverName.trim()) return;
    
    setIsUploading(true);
    try {
      let iconUrl: string | null = null;
      let bannerUrl: string | null = null;
      
      if (iconFile) {
        iconUrl = await uploadToStorage(iconFile, 'server-icons');
      }
      if (bannerFile) {
        bannerUrl = await uploadToStorage(bannerFile, 'server-banners');
      }
      
      onCreate(serverName, iconUrl, bannerUrl, selectedTemplate);
      onClose();
    } catch (error) {
      console.error('Error uploading:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectTemplate = (templateId: string | null) => {
    setSelectedTemplate(templateId);
    setStep('customize');
  };

  const handleJoinSuccess = () => {
    onClose();
  };

  // Show Join Server Modal
  if (step === 'join') {
    return (
      <JoinServerModal
        onClose={onClose}
        onBack={() => setStep('choice')}
        onJoinSuccess={handleJoinSuccess}
        onDiscoverClick={onDiscoverClick}
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative w-full max-w-md bg-card rounded-xl border border-border shadow-2xl overflow-hidden animate-slide-in-right">
          {/* Header */}
          <div className="p-6 text-center relative">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="absolute right-4 top-4"
            >
              <X className="w-5 h-5" />
            </Button>
            
            {step === 'choice' && (
              <>
                <h2 className="text-2xl font-display font-bold">Créer un serveur</h2>
                <p className="text-muted-foreground mt-2">
                  Votre serveur est l'endroit où vous et vos amis traînez. Créez le vôtre et commencez à discuter.
                </p>
              </>
            )}

            {step === 'type' && (
              <>
                <h2 className="text-2xl font-display font-bold">Créer votre serveur</h2>
                <p className="text-muted-foreground mt-2">
                  Votre serveur est l'endroit où vous et vos amis passez du temps. Créez le vôtre et commencez à discuter.
                </p>
              </>
            )}

            {step === 'customize' && (
              <>
                <h2 className="text-2xl font-display font-bold">Personnaliser votre serveur</h2>
                <p className="text-muted-foreground mt-2">
                  Donnez une identité à votre nouveau serveur en lui donnant un nom et une icône.
                </p>
              </>
            )}
          </div>

          {step === 'choice' && (
            <div className="px-6 pb-6 space-y-3">
              <button
                onClick={() => setStep('type')}
                className="w-full p-4 bg-surface-elevated rounded-lg border border-border hover:border-primary/50 hover:bg-surface-hover transition-all group text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-gaming flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-2xl">🎮</span>
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      Créer le mien
                    </h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>

              <div className="pt-4 border-t border-border text-center">
                <p className="text-sm text-muted-foreground mb-3">Vous avez déjà une invitation ?</p>
                <Button variant="outline" className="w-full" onClick={() => setStep('join')}>
                  Rejoindre un serveur
                </Button>
              </div>
            </div>
          )}

          {step === 'type' && (
            <div className="px-6 pb-6 space-y-4">
              <button
                onClick={() => handleSelectTemplate(null)}
                className="w-full p-4 bg-surface-elevated rounded-lg border border-border hover:border-primary/50 hover:bg-surface-hover transition-all group text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-gaming flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-2xl">🎮</span>
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      Créer le mien
                    </h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Commencer à partir d'un modèle
                </p>
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template.id)}
                    className="w-full p-3 bg-surface-elevated rounded-lg border border-border hover:border-primary/50 hover:bg-surface-hover transition-all group text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{template.icon}</span>
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {template.name}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                ))}
              </div>

              <Button variant="ghost" className="w-full" onClick={() => setStep('choice')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </div>
          )}

          {step === 'customize' && (
            <div className="px-6 pb-6">
              {/* Banner Upload */}
              <div className="relative mb-4 group">
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, 'banner')}
                    className="hidden"
                  />
                  <div 
                    className="h-24 rounded-lg bg-muted border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-all overflow-hidden flex items-center justify-center"
                    style={bannerPreview ? { 
                      backgroundImage: `url(${bannerPreview})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    } : undefined}
                  >
                    {!bannerPreview && (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-xs">Ajouter une bannière</span>
                      </div>
                    )}
                  </div>
                  {bannerPreview && (
                    <div className="absolute inset-0 rounded-lg bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                      <Camera className="w-6 h-6 text-foreground" />
                    </div>
                  )}
                </label>
                {bannerPreview && (
                  <button
                    onClick={handleRemoveBanner}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90 transition-opacity z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Icon Upload - centered overlapping banner */}
              <div className="flex justify-center -mt-12 mb-4">
                <div className="relative group">
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'icon')}
                      className="hidden"
                    />
                    <div className="w-20 h-20 rounded-full bg-card border-4 border-card flex items-center justify-center shadow-lg group-hover:scale-105 transition-all overflow-hidden">
                      {iconPreview ? (
                        <img src={iconPreview} alt="Server icon" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-surface-elevated border-2 border-dashed border-muted-foreground/50 flex items-center justify-center group-hover:border-primary/50">
                          <Camera className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      )}
                    </div>
                    {iconPreview && (
                      <div className="absolute inset-0 rounded-full bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                        <Camera className="w-6 h-6 text-foreground" />
                      </div>
                    )}
                  </label>
                  {iconPreview && (
                    <button
                      onClick={handleRemoveIcon}
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90 transition-opacity z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Server Name */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-muted-foreground mb-2">
                  Nom du Serveur
                </label>
                <Input
                  placeholder="Mon super serveur"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  className="text-center"
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  En créant un serveur, vous acceptez les Conditions d'utilisation.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setStep(selectedTemplate ? 'type' : 'choice')}
                  disabled={isUploading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <Button
                  variant="gaming"
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={!serverName.trim() || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    'Créer'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Cropper */}
      <ImageCropper
        open={cropperOpen}
        onClose={() => setCropperOpen(false)}
        imageSrc={cropperImage}
        aspectRatio={cropperType === 'icon' ? 1 : 16 / 9}
        circularCrop={cropperType === 'icon'}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}
