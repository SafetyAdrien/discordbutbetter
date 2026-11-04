import { useState, useRef, useCallback } from 'react';
import { useServers } from '@/hooks/useServers';
import { useUpdateServerInfo, useUploadServerIcon, useUploadServerBanner } from '@/hooks/useServerAssets';
import { Camera, Loader2 } from 'lucide-react';
import { ImageIcon, Smile } from '@/components/icons/discord/lucide';
import { useMembers } from '@/hooks/useMembers';
import { SettingsDivider, SettingsPage, SettingsSection, SettingsToggleRow, UnsavedChangesBar } from './SettingsUI';
import { settingsInputCls, settingsLabelCls, settingsTextareaCls } from './settingsStyles';
import { ImageCropper } from '@/components/ui/image-cropper';
import { ServerIconUploadEditor } from '@/components/server-settings/ServerIconUploadEditor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useServerSettings, useUpdateServerSettings, type ProfileTrait } from '@/hooks/useServerSettings';
import { BANNER_PRESETS } from '@/lib/bannerPresets';
import { cn } from '@/lib/utils';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { ServerPreviewCard } from '@/components/server-views/ServerPreviewCard';

import { appLocale } from '@/i18n/locale';
const padTraits = (traits: ProfileTrait[] | undefined): ProfileTrait[] =>
  Array.from({ length: 5 }, (_, i) => ({ emoji: traits?.[i]?.emoji, label: traits?.[i]?.label ?? '' }));
const cleanTraits = (traits: ProfileTrait[]): ProfileTrait[] =>
  traits.filter((t) => t.label.trim()).map((t) => ({ ...(t.emoji ? { emoji: t.emoji } : {}), label: t.label.trim() }));

interface ServerProfileSettingsProps {
  serverId: string;
}

export function ServerProfileSettings({ serverId }: ServerProfileSettingsProps) {
  const queryClient = useQueryClient();
  const { data: servers = [] } = useServers();
  const server = servers.find(s => s.id === serverId);
  const { data: settings } = useServerSettings(serverId);
  const { data: members = [] } = useMembers(serverId);
  
  const updateServer = useUpdateServerInfo();
  const updateSettings = useUpdateServerSettings();
  const uploadIcon = useUploadServerIcon();
  const uploadBanner = useUploadServerBanner();

  const [formData, setFormData] = useState({
    name: server?.name || '',
    description: server?.description || '',
    flexible_channel_names: settings?.flexible_channel_names ?? true,
    banner_preset: settings?.profile_banner_preset ?? 'default',
    traits: padTraits(settings?.profile_traits),
  });

  // Sync flexible_channel_names when settings load
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  if (settings && !settingsLoaded) {
    setSettingsLoaded(true);
    setFormData(prev => ({
      ...prev,
      flexible_channel_names: settings.flexible_channel_names ?? true,
      banner_preset: settings.profile_banner_preset ?? 'default',
      traits: padTraits(settings.profile_traits),
    }));
  }

  const hasChanges = server && (
    formData.name.trim() !== (server.name || '') ||
    formData.description !== (server.description || '') ||
    formData.flexible_channel_names !== (settings?.flexible_channel_names ?? true) ||
    formData.banner_preset !== (settings?.profile_banner_preset ?? 'default') ||
    JSON.stringify(cleanTraits(formData.traits)) !== JSON.stringify(cleanTraits(settings?.profile_traits ?? []))
  );

  // Cropper / icon editor states
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState<string>('');
  const [cropperType, setCropperType] = useState<'icon' | 'banner'>('icon');
  const [iconEditorFile, setIconEditorFile] = useState<File | null>(null);

  const isSaving = updateServer.isPending || updateSettings.isPending;
  const setTrait = (i: number, patch: Partial<ProfileTrait>) =>
    setFormData((prev) => ({ ...prev, traits: prev.traits.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));

  // N'envoie que ce qui a change : une erreur sur les reglages du profil ne
  // doit pas faire croire que le nom n'a pas ete enregistre (et inversement).
  const handleSave = () => {
    if (!server) return;
    const name = formData.name.trim();
    if (name !== server.name || formData.description !== (server.description || '')) {
      updateServer.mutate({ serverId, name, description: formData.description });
    }

    const settingsPatch: Parameters<typeof updateSettings.mutate>[0]['settings'] = {};
    if (formData.flexible_channel_names !== (settings?.flexible_channel_names ?? true)) {
      settingsPatch.flexible_channel_names = formData.flexible_channel_names;
    }
    if (formData.banner_preset !== (settings?.profile_banner_preset ?? 'default')) {
      settingsPatch.profile_banner_preset = formData.banner_preset;
    }
    if (JSON.stringify(cleanTraits(formData.traits)) !== JSON.stringify(cleanTraits(settings?.profile_traits ?? []))) {
      settingsPatch.profile_traits = cleanTraits(formData.traits);
    }
    if (Object.keys(settingsPatch).length > 0) updateSettings.mutate({ serverId, settings: settingsPatch });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'banner') => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (type === 'icon') {
      // New full-fledged icon editor with circular crop + server-list preview
      setIconEditorFile(file);
      return;
    }

    // Banner keeps the legacy ImageCropper (16:9 aspect)
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
    
    if (cropperType === 'icon') {
      uploadIcon.mutate({ serverId, file });
    } else {
      uploadBanner.mutate({ serverId, file });
    }
  }, [cropperType, serverId, uploadIcon, uploadBanner]);

  const handleRemoveIcon = async () => {
    try {
      const { error } = await supabase
        .from('servers')
        .update({ icon_url: null })
        .eq('id', serverId);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleRemoveBanner = async () => {
    try {
      const { error } = await supabase
        .from('servers')
        .update({ banner_url: null })
        .eq('id', serverId);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (!server) return null;

  const reset = () =>
    setFormData({
      name: server.name || '',
      description: server.description || '',
      flexible_channel_names: settings?.flexible_channel_names ?? true,
      banner_preset: settings?.profile_banner_preset ?? 'default',
      traits: padTraits(settings?.profile_traits),
    });
  const onlineCount = members.filter((m) => m.user.status && m.user.status !== 'offline').length;
  const since = server.created_at
    ? new Date(server.created_at).toLocaleDateString(appLocale(), { month: 'short', year: 'numeric' })
    : null;
  const initials = server.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3);

  return (
    <>
      <SettingsPage
        title="Profil du serveur"
        description="Personnalise la façon dont ton serveur apparaît dans les liens d'invitation et, si cette option est activée, dans la Découverte de serveurs."
      >
        <div className="flex flex-col-reverse lg:flex-row gap-10">
          <div className="flex-1 min-w-0">
            <label htmlFor="server-name" className={settingsLabelCls}>Nom</label>
            <input
              id="server-name"
              value={formData.name}
              maxLength={100}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className={settingsInputCls}
            />

            <SettingsDivider />

            <SettingsSection title="Icône" description="Nous recommandons une taille d'image d'au moins 512 x 512.">
              <div className="flex items-center gap-4">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={(e) => handleFileSelect(e, 'icon')} className="hidden" />
                  <span className="inline-flex items-center h-8 px-4 rounded-lg bg-primary hover:bg-primary/90 text-sm font-medium text-white transition-colors">
                    {uploadIcon.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Changer l'icône du serveur"}
                  </span>
                </label>
                {server.icon_url && (
                  <button type="button" onClick={handleRemoveIcon} className="text-sm font-medium text-foreground hover:underline">
                    Supprimer l'icône
                  </button>
                )}
              </div>
            </SettingsSection>

            <SettingsDivider />

            <SettingsSection title="Bannière" description="Choisis une couleur, ou importe une image (format 16:9 conseillé) : elle s'affiche en haut de la liste des salons et sur les invitations.">
              <div className="flex items-center gap-4">
                <label className="relative block w-[200px] h-[90px] rounded-lg overflow-hidden cursor-pointer ring-1 ring-white/[0.06] group">
                  <input type="file" accept="image/*" onChange={(e) => handleFileSelect(e, 'banner')} className="hidden" />
                  {server.banner_url ? (
                    <img src={server.banner_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#5c5d66] to-[#2c2d32] text-muted-foreground">
                      <ImageIcon className="w-6 h-6" />
                    </span>
                  )}
                  <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    {uploadBanner.isPending ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Camera className="w-5 h-5 text-white" />}
                  </span>
                </label>
                {server.banner_url && (
                  <button type="button" onClick={handleRemoveBanner} className="text-sm font-medium text-foreground hover:underline">
                    Supprimer la bannière
                  </button>
                )}
              </div>
              {!server.banner_url && (
                <div className="mt-4 grid grid-cols-5 gap-2 max-w-[520px]">
                  {BANNER_PRESETS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      aria-label={`Bannière ${b.label}`}
                      aria-pressed={formData.banner_preset === b.id}
                      onClick={() => setFormData((prev) => ({ ...prev, banner_preset: b.id }))}
                      className={cn('h-[58px] rounded-lg ring-offset-2 ring-offset-[hsl(var(--background))] transition-shadow', formData.banner_preset === b.id ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-white/30')}
                      style={{ backgroundImage: b.css }}
                    />
                  ))}
                </div>
              )}
            </SettingsSection>

            <SettingsDivider />

            <SettingsSection title="Description" description="Présente ton serveur en quelques mots.">
              <textarea
                value={formData.description}
                maxLength={1000}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Décris ton serveur..."
                className={settingsTextareaCls}
              />
            </SettingsSection>

            <SettingsDivider />

            <SettingsSection title="Particularités" description="Ajoute jusqu'à 5 particularités pour montrer les intérêts et la personnalité de ton serveur.">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {formData.traits.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 h-10 px-2 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] focus-within:border-primary">
                    <EmojiStickerPicker
                      serverId={null}
                      onEmojiSelect={(emoji) => setTrait(i, { emoji })}
                      trigger={
                        <button type="button" aria-label="Choisir un émoji" className="w-6 h-6 shrink-0 flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white">
                          {t.emoji ? <span className="text-base leading-none">{t.emoji}</span> : <Smile className="w-5 h-5" />}
                        </button>
                      }
                    />
                    <input
                      value={t.label}
                      maxLength={24}
                      onChange={(e) => setTrait(i, { label: e.target.value })}
                      aria-label={`Particularité ${i + 1}`}
                      className="flex-1 min-w-0 bg-transparent text-sm text-foreground outline-none"
                    />
                  </div>
                ))}
              </div>
            </SettingsSection>

            <SettingsDivider />

            <SettingsToggleRow
              title="Noms de salons textuels flexibles"
              description="Les noms de salons textuels peuvent contenir des majuscules, des espaces et des caractères spéciaux. Désactivé, ils sont mis en minuscules avec des tirets."
              checked={formData.flexible_channel_names}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, flexible_channel_names: checked }))}
            />
          </div>

          {/* Apercu, comme la carte a droite de la video */}
          <div className="w-full lg:w-[280px] shrink-0">
            <ServerPreviewCard
              name={formData.name || server.name}
              iconUrl={server.icon_url}
              bannerUrl={server.banner_url}
              bannerPreset={formData.banner_preset}
              community={!!settings?.community_enabled}
              onlineCount={onlineCount}
              memberCount={members.length}
              createdAt={server.created_at}
              traits={cleanTraits(formData.traits)}
            />
          </div>
        </div>

        <UnsavedChangesBar
          visible={!!hasChanges}
          onReset={reset}
          onSave={handleSave}
          saving={isSaving || !formData.name.trim()}
        />
      </SettingsPage>

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
        serverName={server.name}
        onClose={() => setIconEditorFile(null)}
        onFinish={(file) => {
          setIconEditorFile(null);
          uploadIcon.mutate({ serverId, file });
        }}
      />
    </>
  );
}
