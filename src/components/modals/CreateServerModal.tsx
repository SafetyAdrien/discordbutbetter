import { useState, useCallback } from 'react';
import { X, Camera, ChevronRight, ArrowLeft, Loader2, ImageIcon, Download, Hash, Mic, Megaphone, MessageSquare, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JoinServerModal } from './JoinServerModal';
import { ImageCropper } from '@/components/ui/image-cropper';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { StreamlineStage } from '@/components/icons/StreamlineStage';
import { StreamlineHash } from '@/components/icons/StreamlineHash';

interface CreateServerModalProps {
  onClose: () => void;
  onCreate: (name: string, iconFile: File | null, bannerFile: File | null, templateId?: string | null) => void;
  onDiscoverClick?: () => void;
}

interface ImportedTemplate {
  name: string;
  description: string | null;
  serverName: string;
  categories: { name: string; channels: { name: string; type: string; position: number }[] }[];
  orphanChannels: { name: string; type: string; position: number }[];
  roles: { name: string; color: string | null; hoist: boolean }[];
  usageCount: number;
  creator: { username: string } | null;
  iconUrl: string | null;
  bannerUrl: string | null;
}

const templates = [
  { id: 'gaming', name: 'Gaming', icon: '🎮', description: 'Pour les communautés de joueurs' },
  { id: 'friends', name: 'Amis', icon: '💗', description: 'Un espace pour votre groupe d\'amis' },
  { id: 'study', name: 'Groupe d\'étude', icon: '🍎', description: 'Pour les projets éducatifs' },
  { id: 'school', name: 'Club Scolaire', icon: '📚', description: 'Pour les associations étudiantes' },
];

function ChannelTypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'voice': return <StreamlineVoice className={className} />;
    case 'forum': return <StreamlineForum className={className} />;
    case 'announcement': return <StreamlineMegaphone className={className} />;
    case 'stage': return <StreamlineStage className={className} />;
    default: return <StreamlineHash className={className} />;
  }
}

export function CreateServerModal({ onClose, onCreate, onDiscoverClick }: CreateServerModalProps) {
  const { isMobile } = useBreakpoint();
  const [serverName, setServerName] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [step, setStep] = useState<'choice' | 'type' | 'customize' | 'join' | 'import-source' | 'import-discord' | 'import-preview'>('choice');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Import states
  const [templateInput, setTemplateInput] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [importedData, setImportedData] = useState<ImportedTemplate | null>(null);
  const [importServerName, setImportServerName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
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
    const fileName = `${crypto.randomUUID()}/${Date.now()}.${fileExt}`;
    
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
      onCreate(serverName, iconFile, bannerFile, selectedTemplate);
      onClose();
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

  // --- Import logic ---
  const handleFetchTemplate = async () => {
    if (!templateInput.trim()) return;
    setIsFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-discord-template', {
        body: { templateCode: templateInput.trim() },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setImportedData(data as ImportedTemplate);
      setImportServerName(data.serverName || data.name || '');
      setStep('import-preview');
    } catch (err) {
      console.error('Fetch template error:', err);
      toast.error('Impossible de récupérer le template');
    } finally {
      setIsFetching(false);
    }
  };

  const handleImportFinalize = async () => {
    if (!importedData || !importServerName.trim()) return;
    setIsImporting(true);

    try {
      // Create the server with icon/banner from Discord
      const { data: server, error: serverError } = await supabase
        .from('servers')
        .insert({
          name: importServerName.trim(),
          description: importedData.description,
          owner_id: (await supabase.auth.getUser()).data.user?.id,
          icon_url: importedData.iconUrl || null,
          banner_url: importedData.bannerUrl || null,
        })
        .select()
        .single();

      if (serverError) throw serverError;

      // Create categories and channels
      for (let catIdx = 0; catIdx < importedData.categories.length; catIdx++) {
        const cat = importedData.categories[catIdx];
        const { data: category, error: catError } = await supabase
          .from('categories')
          .insert({
            server_id: server.id,
            name: cat.name,
            position: catIdx + 1,
          })
          .select()
          .single();

        if (catError) { console.error('Cat error:', catError); continue; }

        for (let chIdx = 0; chIdx < cat.channels.length; chIdx++) {
          const ch = cat.channels[chIdx];
          await supabase.from('channels').insert({
            server_id: server.id,
            category_id: category.id,
            name: ch.name,
            type: ch.type as any,
            position: chIdx,
          });
        }
      }

      // Create orphan channels
      for (let i = 0; i < importedData.orphanChannels.length; i++) {
        const ch = importedData.orphanChannels[i];
        await supabase.from('channels').insert({
          server_id: server.id,
          name: ch.name,
          type: ch.type as any,
          position: i,
        });
      }

      // Create roles
      for (let rIdx = 0; rIdx < importedData.roles.length; rIdx++) {
        const r = importedData.roles[rIdx];
        await supabase.from('roles').insert({
          server_id: server.id,
          name: r.name,
          color: r.color,
          hoist: r.hoist,
          position: rIdx + 1,
        });
      }

      toast.success('Serveur importé avec succès !');
      onClose();
    } catch (err) {
      console.error('Import error:', err);
      toast.error("Erreur lors de l'importation");
    } finally {
      setIsImporting(false);
    }
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
        <div className="absolute inset-0 backdrop-optimized" onClick={onClose} />
        
        <div className={cn("relative w-full bg-card overflow-hidden animate-slide-in-right gpu-accelerated", isMobile ? "h-full" : "max-w-md rounded-xl border border-border shadow-2xl")}>
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
                <h2 className="text-2xl font-ginto font-bold">Créer un serveur</h2>
                <p className="text-muted-foreground mt-2">
                  Votre serveur est l'endroit où vous et vos amis traînez. Créez le vôtre et commencez à discuter.
                </p>
              </>
            )}

            {step === 'type' && (
              <>
                <h2 className="text-2xl font-ginto font-bold">Créer votre serveur</h2>
                <p className="text-muted-foreground mt-2">
                  Votre serveur est l'endroit où vous et vos amis passez du temps. Créez le vôtre et commencez à discuter.
                </p>
              </>
            )}

            {step === 'customize' && (
              <>
                <h2 className="text-2xl font-ginto font-bold">Personnaliser votre serveur</h2>
                <p className="text-muted-foreground mt-2">
                  Donnez une identité à votre nouveau serveur en lui donnant un nom et une icône.
                </p>
              </>
            )}

            {step === 'import-source' && (
              <>
                <h2 className="text-2xl font-ginto font-bold">Importer un serveur</h2>
                <p className="text-muted-foreground mt-2">
                  Choisissez la plateforme depuis laquelle importer votre serveur.
                </p>
              </>
            )}

            {step === 'import-discord' && (
              <>
                <h2 className="text-2xl font-ginto font-bold">Importer depuis Discord</h2>
                <p className="text-muted-foreground mt-2">
                  Entrez le lien du template Discord ou son ID.
                </p>
              </>
            )}

            {step === 'import-preview' && (
              <>
                <h2 className="text-2xl font-ginto font-bold">Aperçu de l'importation</h2>
                <p className="text-muted-foreground mt-2">
                  Vérifiez les éléments qui seront importés.
                </p>
              </>
            )}
          </div>

          {step === 'choice' && (
            <div className="px-6 pb-6 space-y-3">
              <button
                onClick={() => setStep('type')}
                className="w-full p-4 bg-surface-elevated rounded-lg border border-border hover:border-primary/50 hover:bg-surface-hover transition-colors duration-200 group text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-gaming flex items-center justify-center group-hover:scale-110 transition-transform duration-150">
                      <span className="text-2xl">🎮</span>
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-150">
                      Créer le mien
                    </h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-150" />
                </div>
              </button>

              <button
                onClick={() => setStep('import-source')}
                className="w-full p-4 bg-surface-elevated rounded-lg border border-border hover:border-primary/50 hover:bg-surface-hover transition-colors duration-200 group text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform duration-150">
                      <Download className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-150">
                      Importer un serveur
                    </h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-150" />
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

          {step === 'import-source' && (
            <div className="px-6 pb-6 space-y-3">
              <button
                onClick={() => setStep('import-discord')}
                className="w-full p-4 bg-surface-elevated rounded-lg border border-border hover:border-primary/50 hover:bg-surface-hover transition-colors duration-200 group text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#5865F2] flex items-center justify-center group-hover:scale-110 transition-transform duration-150">
                      <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-150">
                        Discord
                      </h3>
                      <p className="text-xs text-muted-foreground">Via un template discord.new</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-150" />
                </div>
              </button>

              <button
                disabled
                className="w-full p-4 bg-surface-elevated rounded-lg border border-border opacity-50 cursor-not-allowed text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">F</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Fluxer
                      </h3>
                      <p className="text-xs text-muted-foreground">Bientôt disponible</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Soon</span>
                </div>
              </button>

              <Button variant="ghost" className="w-full" onClick={() => setStep('choice')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </div>
          )}

          {step === 'import-discord' && (
            <div className="px-6 pb-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-muted-foreground">
                  Lien ou ID du template
                </label>
                <Input
                  placeholder="https://discord.new/XXXXX ou ID du template"
                  value={templateInput}
                  onChange={(e) => setTemplateInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchTemplate()}
                />
                <p className="text-xs text-muted-foreground">
                  Formats acceptés : discord.new/XXX, discord.com/template/XXX, ou l'ID directement
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setStep('import-source')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <Button
                  variant="gaming"
                  className="flex-1"
                  onClick={handleFetchTemplate}
                  disabled={!templateInput.trim() || isFetching}
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Récupération...
                    </>
                  ) : (
                    'Récupérer'
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'import-preview' && importedData && (
            <div className="px-6 pb-6 space-y-4">
              {/* Icon & Banner preview */}
              {(importedData.iconUrl || importedData.bannerUrl) && (
                <div className="relative">
                  {importedData.bannerUrl ? (
                    <div
                      className="h-20 rounded-lg bg-muted overflow-hidden"
                      style={{
                        backgroundImage: `url(${importedData.bannerUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  ) : (
                    <div className="h-20 rounded-lg bg-muted" />
                  )}
                  {importedData.iconUrl && (
                    <div className="flex justify-center -mt-8">
                      <div className="w-16 h-16 rounded-full border-4 border-card overflow-hidden bg-card shadow-lg">
                        <img src={importedData.iconUrl} alt="Server icon" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Server name */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-muted-foreground">
                  Nom du serveur
                </label>
                <Input
                  value={importServerName}
                  onChange={(e) => setImportServerName(e.target.value)}
                />
              </div>

              {importedData.description && (
                <p className="text-xs text-muted-foreground italic">{importedData.description}</p>
              )}

              {/* Channels preview */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Salons ({importedData.categories.reduce((acc, c) => acc + c.channels.length, 0) + importedData.orphanChannels.length})
                </p>
                {importedData.categories.map((cat, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">{cat.name}</p>
                    {cat.channels.map((ch, chIdx) => (
                      <div key={chIdx} className="flex items-center gap-2 px-3 py-1 text-sm text-foreground">
                        <ChannelTypeIcon type={ch.type} className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{ch.name}</span>
                      </div>
                    ))}
                  </div>
                ))}
                {importedData.orphanChannels.map((ch, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-1 text-sm text-foreground">
                    <ChannelTypeIcon type={ch.type} className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{ch.name}</span>
                  </div>
                ))}
              </div>

              {/* Roles preview */}
              {importedData.roles.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Rôles ({importedData.roles.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {importedData.roles.map((role, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border border-border bg-muted"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: role.color || '#99AAB5' }}
                        />
                        {role.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {importedData.creator && (
                <p className="text-xs text-muted-foreground">
                  Créé par {importedData.creator.username} • {importedData.usageCount} utilisations
                </p>
              )}

              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setStep('import-discord')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <Button
                  variant="gaming"
                  className="flex-1"
                  onClick={handleImportFinalize}
                  disabled={!importServerName.trim() || isImporting}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importation...
                    </>
                  ) : (
                    'Finaliser'
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'type' && (
            <div className="px-6 pb-6 space-y-4">
              <button
                onClick={() => handleSelectTemplate(null)}
                className="w-full p-4 bg-surface-elevated rounded-lg border border-border hover:border-primary/50 hover:bg-surface-hover transition-colors duration-200 group text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-gaming flex items-center justify-center group-hover:scale-110 transition-transform duration-150">
                      <span className="text-2xl">🎮</span>
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-150">
                      Créer le mien
                    </h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-150" />
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
                    className="w-full p-3 bg-surface-elevated rounded-lg border border-border hover:border-primary/50 hover:bg-surface-hover transition-colors duration-200 group text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{template.icon}</span>
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors duration-150">
                          {template.name}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-150" />
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
