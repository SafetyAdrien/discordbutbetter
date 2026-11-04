import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, Loader2 } from 'lucide-react';
import { X, ChevronRight, ChevronDown, ArrowLeft, ImageIcon, Download, Hash, Mic, Megaphone, MessageSquare, Shield } from '@/components/icons/discord/lucide';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { JoinServerModal } from './JoinServerModal';
import { ImageCropper } from '@/components/ui/image-cropper';
import { ServerIconUploadEditor } from '@/components/server-settings/ServerIconUploadEditor';
import { decodeServerTemplate } from '@/lib/serverTemplateCode';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { OPEN_SERVER_EVENT } from '@/lib/invites';

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
}

type ChannelType = Database['public']['Enums']['channel_type'];

const toChannelType = (type: string): ChannelType => {
  const allowed: ChannelType[] = ['text', 'voice', 'forum', 'announcement', 'media', 'calendar', 'tasks', 'stage', 'link'];
  return allowed.includes(type as ChannelType) ? (type as ChannelType) : 'text';
};

const templates = [
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'friends', name: 'Amis', icon: '💗' },
  { id: 'study', name: 'Groupe d\'étude', icon: '🍎' },
  { id: 'school', name: 'Club scolaire', icon: '📘' },
  { id: 'local', name: 'Communauté locale', icon: '🌿' },
  { id: 'creators', name: 'Artistes et créateurs', icon: '🎨' },
];

/* Ligne cliquable des etapes de creation, comme Discord : 60px, fond de carte,
   bord 1px, icone 32px, libelle 16px et chevron a droite. */
function OptionRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-[60px] px-4 flex items-center gap-3 rounded-lg bg-[hsl(var(--surface-card))] border border-[hsl(var(--button-secondary))] hover:bg-[hsl(var(--surface-hover))] transition-colors text-left group"
    >
      <span className="w-8 h-8 shrink-0 flex items-center justify-center text-2xl leading-none">{icon}</span>
      <span className="flex-1 min-w-0 text-base font-medium text-foreground truncate">{label}</span>
      <ChevronRight className="w-5 h-5 shrink-0 text-[hsl(var(--icon-default))] group-hover:text-foreground transition-colors" />
    </button>
  );
}

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
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [serverName, setServerName] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [step, setStep] = useState<'type' | 'audience' | 'customize' | 'join' | 'import-source' | 'import-discord' | 'import-preview'>('type');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Import states
  const [templateInput, setTemplateInput] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [importedData, setImportedData] = useState<ImportedTemplate | null>(null);
  const [importServerName, setImportServerName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [rolesOpen, setRolesOpen] = useState(true);

  // Cropper states
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState<string>('');
  const [cropperType, setCropperType] = useState<'icon' | 'banner'>('icon');
  const [iconEditorFile, setIconEditorFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'banner') => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (type === 'icon') {
      setIconEditorFile(file);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCropperImage(reader.result as string);
      setCropperType(type);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
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
    setStep('audience');
  };

  // Etape "Personnalise ton serveur" : nom pre-rempli comme Discord.
  const goCustomize = () => {
    if (!serverName.trim()) {
      const who = profile?.display_name || profile?.username;
      if (who) setServerName(`Serveur de ${who}`);
    }
    setStep('customize');
  };

  const handleJoinSuccess = () => {
    onClose();
  };

  // --- Import logic ---
  const handleFetchTemplate = async () => {
    if (!templateInput.trim()) return;
    // Code de modele genere par l'app (page "Modele de serveur") : decode
    // localement, sans passer par la fonction d'import Discord.
    const local = decodeServerTemplate(templateInput);
    if (local) {
      setImportedData({ ...local, usageCount: 0, creator: null });
      setImportServerName(local.serverName || local.name || '');
      setIconFile(null);
      setIconPreview(null);
      setBannerFile(null);
      setBannerPreview(null);
      setStep('import-preview');
      return;
    }
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
      setIconFile(null);
      setIconPreview(null);
      setBannerFile(null);
      setBannerPreview(null);
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
    let step = 'création du serveur';

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data: server, error: serverError } = await supabase
        .from('servers')
        .insert({ name: importServerName.trim(), description: importedData.description, owner_id: userId })
        .select()
        .single();
      if (serverError) throw serverError;

      // Les images se rangent dans le dossier du serveur (<id>/...) : la regle
      // de stockage n'autorise que son proprietaire. Avant, l'envoi se faisait
      // avant la creation, dans un dossier aleatoire, et echouait.
      step = 'envoi des images';
      const uploadAsset = async (file: File, bucket: string) => {
        const path = `${server.id}/${Date.now()}.${file.name.split('.').pop() || 'png'}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file);
        if (error) throw error;
        return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      };
      const [iconUrl, bannerUrl] = await Promise.all([
        iconFile ? uploadAsset(iconFile, 'server-icons') : Promise.resolve(null),
        bannerFile ? uploadAsset(bannerFile, 'server-banners') : Promise.resolve(null),
      ]);
      if (iconUrl || bannerUrl) {
        await supabase.from('servers').update({ icon_url: iconUrl, banner_url: bannerUrl }).eq('id', server.id);
      }

      // Un modele remplace la structure par defaut ("Salons textuels / vocaux").
      step = 'préparation des salons';
      const hasStructure = importedData.categories.length > 0 || importedData.orphanChannels.length > 0;
      if (hasStructure) {
        await supabase.from('channels').delete().eq('server_id', server.id);
        await supabase.from('categories').delete().eq('server_id', server.id);
      }

      step = 'création des salons';
      const failures: string[] = [];
      for (let catIdx = 0; catIdx < importedData.categories.length; catIdx++) {
        const cat = importedData.categories[catIdx];
        const { data: category, error: catError } = await supabase
          .from('categories')
          .insert({ server_id: server.id, name: cat.name, position: catIdx })
          .select()
          .single();
        if (catError || !category) {
          failures.push(cat.name);
          continue;
        }
        if (cat.channels.length) {
          const { error } = await supabase.from('channels').insert(
            cat.channels.map((ch, chIdx) => ({ server_id: server.id, category_id: category.id, name: ch.name, type: toChannelType(ch.type), position: chIdx })),
          );
          if (error) failures.push(`salons de ${cat.name}`);
        }
      }
      if (importedData.orphanChannels.length) {
        const { error } = await supabase.from('channels').insert(
          importedData.orphanChannels.map((ch, i) => ({ server_id: server.id, name: ch.name, type: toChannelType(ch.type), position: i })),
        );
        if (error) failures.push('salons sans catégorie');
      }

      step = 'création des rôles';
      if (importedData.roles.length) {
        // Les modeles Discord listent les roles du plus bas au plus haut.
        const { error } = await supabase.from('roles').insert(
          importedData.roles.map((r, rIdx) => ({ server_id: server.id, name: r.name, color: r.color, hoist: r.hoist, position: rIdx + 1 })),
        );
        if (error) failures.push('rôles');
      }

      if (failures.length) toast.warning(`Serveur créé, mais certains éléments n'ont pas pu être importés : ${failures.join(', ')}`);
      else toast.success('Serveur importé !');
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      window.dispatchEvent(new CustomEvent(OPEN_SERVER_EVENT, { detail: { serverId: server.id } }));
      onClose();
    } catch (err) {
      console.error('Import error:', err);
      const detail = err instanceof Error ? err.message : (err as { message?: string })?.message;
      toast.error(`Erreur lors de l'importation (${step})${detail ? ` : ${detail}` : ''}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Show Join Server Modal
  if (step === 'join') {
    return (
      <JoinServerModal
        onClose={onClose}
        onBack={() => setStep('type')}
        onJoinSuccess={handleJoinSuccess}
        onDiscoverClick={onDiscoverClick}
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
        <div className="absolute inset-0 backdrop-optimized" onClick={onClose} />
        
        <div className={cn(
          "relative w-full bg-[hsl(var(--search-background))] animate-appear gpu-accelerated",
          isMobile ? "h-full" : "max-w-[440px] rounded-xl border border-[hsl(var(--button-secondary))] shadow-2xl",
          step === 'import-preview'
            ? cn("overflow-y-auto", !isMobile && "max-h-[85vh]")
            : "overflow-hidden"
        )}>
          {/* Header */}
          <div className={cn("relative text-center", step === 'type' || step === 'audience' || step === 'customize' ? "px-4 pt-6 pb-4" : "p-6")}>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 text-[hsl(var(--icon-default))] hover:text-foreground transition-colors"
              aria-label="Fermer"
            >
              <X className="w-6 h-6" />
            </button>

            {step === 'type' && (
              <>
                <h2 className="text-2xl font-bold text-foreground leading-[30px]">Crée ton serveur</h2>
                <p className="mt-2 px-4 text-base leading-5 text-muted-foreground">
                  Ton serveur est l'endroit où tu retrouves tes amis. Crée le tien et lance une discussion.
                </p>
              </>
            )}

            {step === 'audience' && (
              <>
                <h2 className="text-2xl font-bold text-foreground leading-[30px]">Dis-nous en plus sur ton serveur</h2>
                <p className="mt-2 px-4 text-base leading-5 text-muted-foreground">
                  Pour t'aider à configurer ton nouveau serveur, dis nous s'il est destiné à quelques amis uniquement ou à une communauté plus importante.
                </p>
              </>
            )}

            {step === 'customize' && (
              <>
                <h2 className="text-2xl font-bold text-foreground leading-[30px]">Personnalise ton serveur</h2>
                <p className="mt-2 px-4 text-base leading-5 text-muted-foreground">
                  Donne une personnalité à ton nouveau serveur en choisissant un nom et une icône. Tu pourras toujours les modifier plus tard.
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

          {step === 'import-source' && (
            <div className="px-6 pb-6 space-y-3">
              <button type="button"
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
                      <p className="text-xs text-muted-foreground">Via un template discord.new ou un code de modèle de l'app</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-150" />
                </div>
              </button>

              <button type="button"
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

              <Button variant="ghost" className="w-full" onClick={() => setStep('type')}>
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
              {/* Icon & Banner upload — Discord's template API never exposes the source server's icon/banner, so pick one manually */}
              <div>
                <div className="relative group">
                  <label className="cursor-pointer block" aria-label="Importer une bannière pour le serveur">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'banner')}
                      className="hidden"
                    />
                    <div
                      className="h-20 rounded-lg bg-muted border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-all overflow-hidden flex items-center justify-center"
                      style={bannerPreview ? {
                        backgroundImage: `url(${bannerPreview})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      } : undefined}
                    >
                      {!bannerPreview && (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <ImageIcon className="w-5 h-5" />
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
                    <button type="button"
                      onClick={handleRemoveBanner}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90 transition-opacity z-10"
                      aria-label="Supprimer la bannière du serveur"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex justify-center -mt-8">
                  <div className="relative group">
                    <label className="cursor-pointer block" aria-label="Importer une icône pour le serveur">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e, 'icon')}
                        className="hidden"
                      />
                      <div className="w-16 h-16 rounded-full border-4 border-card overflow-hidden bg-card shadow-lg flex items-center justify-center">
                        {iconPreview ? (
                          <img src={iconPreview} alt="Server icon" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full rounded-full bg-surface-elevated border-2 border-dashed border-muted-foreground/50 flex items-center justify-center group-hover:border-primary/50">
                            <Camera className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        )}
                      </div>
                      {iconPreview && (
                        <div className="absolute inset-0 rounded-full bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                          <Camera className="w-5 h-5 text-foreground" />
                        </div>
                      )}
                    </label>
                    {iconPreview && (
                      <button type="button"
                        onClick={handleRemoveIcon}
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90 transition-opacity z-10"
                        aria-label="Supprimer l'icône du serveur"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground mt-1">
                  Discord ne fournit pas l'icône ni la bannière via un template — ajoutez-les manuellement si besoin.
                </p>
              </div>

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
              <Collapsible open={channelsOpen} onOpenChange={setChannelsOpen} className="rounded-lg border border-border overflow-hidden">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 hover:bg-surface-hover transition-colors">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Salons ({importedData.categories.reduce((acc, c) => acc + c.channels.length, 0) + importedData.orphanChannels.length})
                  </p>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", channelsOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-2 pb-2 space-y-2 max-h-56 overflow-y-auto">
                  {importedData.categories.map((cat, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <p translate="no" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">{cat.name}</p>
                      {cat.channels.map((ch, chIdx) => (
                        <div key={chIdx} className="channel-item text-sm">
                          <ChannelTypeIcon type={ch.type} className="w-4 h-4 flex-shrink-0" />
                          <span translate="no" className="truncate">{ch.name}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {importedData.orphanChannels.map((ch, idx) => (
                    <div key={idx} className="channel-item text-sm">
                      <ChannelTypeIcon type={ch.type} className="w-4 h-4 flex-shrink-0" />
                      <span translate="no" className="truncate">{ch.name}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Roles preview */}
              {importedData.roles.length > 0 && (
                <Collapsible open={rolesOpen} onOpenChange={setRolesOpen} className="rounded-lg border border-border overflow-hidden">
                  <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 hover:bg-surface-hover transition-colors">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Rôles ({importedData.roles.length})
                    </p>
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", rolesOpen && "rotate-180")} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3 max-h-56 overflow-y-auto">
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
                  </CollapsibleContent>
                </Collapsible>
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
            <div key="type" className="animate-step-in">
              <div className="px-4 max-h-[min(330px,45vh)] overflow-y-auto scrollbar-thin space-y-2 pb-2">
                <OptionRow icon="🖌️" label="Créer le mien" onClick={() => handleSelectTemplate(null)} />
                <p className="pt-2 pb-0.5 text-xs font-bold text-muted-foreground">Commencer à partir d'un modèle</p>
                {templates.map((t) => (
                  <OptionRow key={t.id} icon={t.icon} label={t.name} onClick={() => handleSelectTemplate(t.id)} />
                ))}
                {/* Ajout de l'app : import d'un serveur Discord ou d'un code de modele. */}
                <p className="pt-2 pb-0.5 text-xs font-bold text-muted-foreground">Importer</p>
                <OptionRow
                  icon={<Download className="w-6 h-6 text-[hsl(var(--icon-default))]" />}
                  label="Importer un serveur"
                  onClick={() => setStep('import-source')}
                />
              </div>
              <div className="px-4 pt-4 pb-4 text-center">
                <p className="text-xl font-bold text-foreground leading-6 mb-2">Tu as déjà une invitation ?</p>
                <button
                  type="button"
                  onClick={() => setStep('join')}
                  className="w-full h-10 rounded-lg bg-[hsl(var(--input))] hover:bg-[hsl(var(--button-secondary))] text-sm font-medium text-foreground transition-colors"
                >
                  Rejoindre un serveur
                </button>
              </div>
            </div>
          )}

          {step === 'audience' && (
            <div key="audience" className="animate-step-in">
              <div className="px-4 space-y-2">
                <OptionRow icon="🌍" label="Pour un club ou une communauté" onClick={goCustomize} />
                <OptionRow icon="👾" label="Pour mes amis et moi" onClick={goCustomize} />
                <p className="pt-3 text-center text-sm text-muted-foreground">
                  Tu ne sais pas ? Tu peux{' '}
                  <button type="button" onClick={goCustomize} className="text-[hsl(var(--text-link))] hover:underline">
                    ignorer cette question
                  </button>{' '}
                  pour l'instant.
                </p>
              </div>
              <div className="mt-6 px-4 py-4 bg-[hsl(var(--card))] flex items-center">
                <button type="button" onClick={() => setStep('type')} className="text-sm font-medium text-foreground hover:underline">
                  Retour
                </button>
              </div>
            </div>
          )}

          {step === 'customize' && (
            <div key="customize" className="animate-step-in">
              <div className="px-4">
                {/* Icone : cercle pointille 80px "Uploader" avec pastille + */}
                <div className="flex justify-center pt-2 pb-6">
                  <div className="relative group">
                    <label className="relative cursor-pointer block" aria-label="Importer ou modifier l'icône du serveur">
                      <input type="file" accept="image/*" onChange={(e) => handleFileSelect(e, 'icon')} className="hidden" />
                      {iconPreview ? (
                        <img src={iconPreview} alt="Icône du serveur" className="w-20 h-20 rounded-full object-cover" />
                      ) : (
                        <span className="relative w-20 h-20 rounded-full flex flex-col items-center justify-center gap-0.5 text-foreground">
                          <svg className="absolute inset-0 w-20 h-20" viewBox="0 0 80 80" fill="none" aria-hidden="true">
                            <circle cx="40" cy="40" r="38.5" stroke="currentColor" strokeWidth="2" strokeDasharray="10 7" className="text-[hsl(var(--icon-default))]" />
                          </svg>
                          <Camera className="w-6 h-6" />
                          <span className="text-[11px] font-bold leading-none">Uploader</span>
                        </span>
                      )}
                      {!iconPreview && (
                        <span className="absolute top-0 right-0 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-base leading-none font-bold">+</span>
                      )}
                      {iconPreview && (
                        <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                          <Camera className="w-6 h-6 text-white" />
                        </span>
                      )}
                    </label>
                    {iconPreview && (
                      <button type="button" onClick={handleRemoveIcon}
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90 transition-opacity z-10"
                        aria-label="Supprimer l'icône du serveur">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <label htmlFor="create-server-name" className="block mb-2 text-base font-semibold text-foreground">
                  Nom du serveur <span className="text-destructive">*</span>
                </label>
                <input
                  id="create-server-name"
                  autoFocus
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && serverName.trim()) handleCreate(); }}
                  maxLength={100}
                  className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-white/[0.06] focus:border-primary text-base text-foreground outline-none transition-colors"
                />

                {/* Banniere : ajout propre a l'app (facultatif). */}
                <div className="mt-3 flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-[hsl(var(--text-link))] hover:underline">
                    <input type="file" accept="image/*" onChange={(e) => handleFileSelect(e, 'banner')} className="hidden" />
                    <ImageIcon className="w-4 h-4" />
                    {bannerPreview ? 'Changer la bannière' : 'Ajouter une bannière (facultatif)'}
                  </label>
                  {bannerPreview && (
                    <>
                      <img src={bannerPreview} alt="" className="h-6 w-12 rounded object-cover" />
                      <button type="button" onClick={handleRemoveBanner} aria-label="Supprimer la bannière du serveur"
                        className="text-[hsl(var(--icon-default))] hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                <p className="mt-2 pb-6 text-xs text-muted-foreground">
                  En créant un serveur, tu acceptes la{' '}
                  <span className="font-semibold text-[hsl(var(--text-link))]">Charte d'Utilisation de la Communauté</span>.
                </p>
              </div>

              <div className="px-4 py-4 bg-[hsl(var(--card))] flex items-center justify-between">
                <button type="button" onClick={() => setStep('audience')} disabled={isUploading}
                  className="text-sm font-medium text-foreground hover:underline">
                  Retour
                </button>
                <Button onClick={handleCreate} disabled={!serverName.trim() || isUploading} className="h-10 px-6 rounded-lg">
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Banner cropper (legacy 16:9) */}
      <ImageCropper
        open={cropperOpen}
        onClose={() => setCropperOpen(false)}
        imageSrc={cropperImage}
        aspectRatio={16 / 9}
        circularCrop={false}
        onCropComplete={handleCropComplete}
      />

      {/* Server icon editor */}
      <ServerIconUploadEditor
        open={!!iconEditorFile}
        file={iconEditorFile}
        serverName={serverName || 'New server'}
        onClose={() => setIconEditorFile(null)}
        onFinish={(file) => {
          setIconEditorFile(null);
          setIconFile(file);
          setIconPreview(URL.createObjectURL(file));
        }}
      />
    </>
  );
}
