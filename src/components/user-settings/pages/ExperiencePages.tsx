import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { appLocale } from '@/i18n/locale';
import { DESKTOP_ZOOM_STEPS, isDesktopApp } from '@/lib/desktop';
import { useEffect, useRef, useState } from 'react';
import { Play, PersonStanding } from 'lucide-react';
import { Check, Headphones, Mic, RefreshCw, Bell, Download, Trash2 } from '@/components/icons/discord/lucide';
import { useVoice } from '@/contexts/VoiceContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/hooks/useUserSettings';
import { KEYBOARD_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { CategoryCaseSection } from '@/components/appearance/CategoryCaseSection';
import { CustomThemeBanner } from '@/components/appearance/CustomThemeBanner';
import { MarkdownHelpPage } from '@/components/account-settings/MarkdownHelpPage';
import { DEFAULT_USER_SETTINGS, formatClock, type InputProfile, type ThemeVariant } from '@/lib/userSettings';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { UBanner, UButton, SliderBubble, UMarkedSlider, URadioGroup, URelated, URow, USection, USelect, UToggle } from '../UserSettingsUI';
import { useUserSettingsNav } from '../UserSettingsNavContext';
import { LanguageSelect } from '../LanguageSelect';

/* ----------------------------------------------------------- Voix & Video -- */

function useMicMeter(active: boolean, deviceId: string) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let ctx: AudioContext | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ audio: deviceId && deviceId !== 'default' ? { deviceId: { exact: deviceId } } : true })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(s).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
          setLevel(peak);
          raf = requestAnimationFrame(tick);
        };
        tick();
      })
      .catch(() => toast.error("L'accès au micro a été refusé"));
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close();
      setLevel(0);
    };
  }, [active, deviceId]);
  return level;
}

function MeterBars({ level }: { level: number }) {
  const bars = 48;
  const lit = Math.round(Math.min(1, level * 2.2) * bars);
  return (
    <div className="flex-1 flex items-center gap-[3px] h-8" aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className={cn('flex-1 h-full rounded-sm', i < lit ? 'bg-[#f0b232]' : 'bg-[hsl(var(--button-secondary))]')} />
      ))}
    </div>
  );
}

function VolumeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const pct = value / 2;
  const [active, setActive] = useState(false);
  return (
    <div className="relative h-5" onPointerEnter={() => setActive(true)} onPointerLeave={() => setActive(false)}>
      <SliderBubble text={`${value}%`} left={`${pct}%`} show={active} />
      <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-1.5 rounded-full bg-[hsl(var(--button-secondary))]" />
      <div className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      <input type="range" min={0} max={200} value={value} onChange={(e) => onChange(Number(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer" aria-label="Volume" />
      <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow pointer-events-none" style={{ left: `${pct}%` }} />
    </div>
  );
}

const PROFILE_PRESETS: Record<Exclude<InputProfile, 'custom'>, { noise: 'off' | 'low' | 'high'; vad: 'low' | 'medium' | 'high' }> = {
  isolation: { noise: 'high', vad: 'medium' },
  studio: { noise: 'off', vad: 'low' },
};

export function VoicePage() {
  const voice = useVoice();
  const { settings, update } = useUserSettings();
  const { goTo } = useUserSettingsNav();
  const [testing, setTesting] = useState(false);
  const level = useMicMeter(testing, voice.inputDeviceId);
  const [camera, setCamera] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const v = settings.voice;

  useEffect(() => {
    voice.refreshDevices?.();
    navigator.mediaDevices?.enumerateDevices?.().then((d) => setCameras(d.filter((x) => x.kind === 'videoinput')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = camera;
  }, [camera]);
  useEffect(() => () => camera?.getTracks().forEach((t) => t.stop()), [camera]);

  const toggleCamera = async () => {
    if (camera) {
      camera.getTracks().forEach((t) => t.stop());
      return setCamera(null);
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: v.camera_device !== 'default' ? { deviceId: { exact: v.camera_device } } : true });
      setCamera(s);
    } catch {
      toast.error("L'accès à la caméra a été refusé");
    }
  };

  const setProfile = (p: InputProfile) => {
    update({ voice: { input_profile: p } });
    if (p !== 'custom') {
      voice.setNoiseSuppression(PROFILE_PRESETS[p].noise);
      voice.setVadSensitivity(PROFILE_PRESETS[p].vad);
    }
  };

  const deviceOptions = (list: MediaDeviceInfo[]) => [
    { value: 'default', label: 'Paramètres audio système par défaut' },
    ...list.filter((d) => d.deviceId && d.deviceId !== 'default').map((d) => ({ value: d.deviceId, label: d.label || 'Périphérique sans nom' })),
  ];
  const vadValue = { low: 25, medium: 50, high: 75 }[voice.vadSensitivity];

  return (
    <>
      <USection id="voice-voice" title="Voix">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <p className="mb-2 text-sm font-medium text-white">Micro</p>
            <USelect value={voice.inputDeviceId || 'default'} options={deviceOptions(voice.availableInputs)} onChange={(id) => voice.setInputDeviceId(id)} icon={<Mic className="w-4 h-4" />} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-white">Haut-parleur</p>
            <USelect
              value={voice.outputDeviceId || 'default'}
              options={deviceOptions(voice.availableOutputs)}
              onChange={(id) => voice.setOutputDeviceId(id)}
              icon={<Headphones className="w-4 h-4" />}
              disabled={!voice.outputSinkSupported}
            />
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-white">Volume du micro</p>
            <VolumeSlider value={voice.micVolume} onChange={voice.setMicVolume} />
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-white">Volume du haut-parleur</p>
            <VolumeSlider value={voice.outputVolume} onChange={voice.setOutputVolume} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <UButton tone="primary" onClick={() => setTesting((t) => !t)}>{testing ? 'Arrêter le test' : 'Test du micro'}</UButton>
          <MeterBars level={level} />
        </div>
        {testing && <p className="-mt-3 text-xs text-muted-foreground">Parle pour vérifier que ton micro capte bien ta voix.</p>}
        {voice.micPermission === 'denied' && (
          <UBanner tone="warning">Tu n'as aucun micro actif. Autorise l'accès au micro dans ton navigateur pour que l'app puisse le détecter.</UBanner>
        )}
        <div className="pt-5 border-t border-white/[0.06]">
          <URadioGroup
            label="Profil d'entrée audio"
            value={v.input_profile}
            onChange={setProfile}
            options={[
              { value: 'isolation', label: 'Isolement de la voix', description: "Rien que ta jolie voix : laisse l'app s'occuper des bruits parasites" },
              { value: 'studio', label: 'Studio', description: 'Audio pur : micro ouvert sans aucun traitement' },
              { value: 'custom', label: 'Personnalisés', description: 'Mode avancé : je veux utiliser tous les boutons !' },
            ]}
          />
        </div>
        {v.input_profile === 'custom' && (
          <>
            <div>
              <p className="text-base font-medium text-white">Sensibilité de la détection de la voix</p>
              <p className="mt-1 text-sm text-muted-foreground">Contrôle le volume du son que l'app transmet depuis ton micro.</p>
              <div className="relative mt-4 h-5">
                <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-1.5 rounded-full bg-gradient-to-r from-[#f0b232] via-[#f0b232] to-[hsl(var(--online))]" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={vadValue}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    voice.setVadSensitivity(n < 34 ? 'low' : n < 67 ? 'medium' : 'high');
                  }}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  aria-label="Sensibilité de la détection de la voix"
                />
                <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow pointer-events-none" style={{ left: `${vadValue}%` }} />
              </div>
            </div>
            <URow title="Suppression du bruit" description="Réduit le bruit de fond de ton micro.">
              <div className="w-[200px]">
                <USelect
                  value={voice.noiseSuppression}
                  onChange={voice.setNoiseSuppression}
                  options={[
                    { value: 'high', label: voice.rnnoiseAvailable ? 'Avancée (IA)' : 'Avancée' },
                    { value: 'low', label: 'Standard' },
                    { value: 'off', label: 'Aucune' },
                  ]}
                />
              </div>
            </URow>
            <UToggle title="Filtre passe-haut" description="Coupe les grondements graves (souffle, vibrations du bureau)." checked={voice.audioFilters.highPass} onChange={(c) => voice.setAudioFilter('highPass', c)} />
            <UToggle title="Atténuation des sifflantes" description="Adoucit les « s » trop aigus." checked={voice.audioFilters.deEsser} onChange={(c) => voice.setAudioFilter('deEsser', c)} />
          </>
        )}
        <UToggle
          title="Appuyer pour parler"
          description={voice.isPushToTalkMode ? 'Ton micro ne transmet que lorsque tu maintiens la touche configurée enfoncée. Les raccourcis sont listés dans Système.' : undefined}
          checked={voice.isPushToTalkMode}
          onChange={() => voice.togglePushToTalkMode()}
        />
      </USection>

      <USection id="voice-camera" title="Caméra">
        <div className="h-[250px] rounded-lg bg-[hsl(var(--card))] flex items-center justify-center overflow-hidden">
          {camera ? <video ref={videoRef} autoPlay muted playsInline className="h-full object-contain -scale-x-100" /> : <UButton tone="primary" onClick={toggleCamera}>Test vidéo</UButton>}
        </div>
        {camera && <UButton onClick={toggleCamera}>Arrêter la vidéo</UButton>}
        <div>
          <p className="mb-2 text-sm font-medium text-white">Caméra</p>
          <USelect
            value={v.camera_device}
            onChange={(id) => {
              update({ voice: { camera_device: id } });
              camera?.getTracks().forEach((t) => t.stop());
              setCamera(null);
            }}
            options={[{ value: 'default', label: 'Caméra par défaut' }, ...cameras.filter((c) => c.deviceId).map((c) => ({ value: c.deviceId, label: c.label || 'Caméra' }))]}
          />
          <p className="mt-1 text-xs text-muted-foreground">Utilisée pour ce test ; les appels utilisent encore la caméra par défaut de l'appareil.</p>
        </div>
      </USection>

      <USection id="voice-streaming" title="Streaming">
        <UToggle soon checked={false} title="Afficher les aperçus du stream" description="Permet aux autres de voir un aperçu de ton stream avant qu'ils ne le rejoignent." />
      </USection>

      <USection id="voice-sounds" title="Sons">
        <UToggle soon checked={false} title="Mettre en sourdine" />
        <UToggle soon checked={false} title="Rétablir le son" />
        <UToggle soon checked={false} title="Rendre muet" />
        <UToggle soon checked={false} title="Ne plus rendre muet" />
        <URelated icon={<Bell className="w-5 h-5" />} title="Notifications" description="Active/désactive les sons pour les nouveaux messages et les appels entrants." onClick={() => goTo('notifications', 'notif-sounds')} />
      </USection>

      <USection id="voice-soundboard" title="Soundboard">
        <div>
          <p className="text-base font-medium text-white">Volume du Soundboard</p>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">Contrôle le volume des sons uniquement pour toi.</p>
          <VolumeSlider value={v.soundboard_volume * 2} onChange={(n) => update({ voice: { soundboard_volume: Math.round(n / 2) } })} />
        </div>
        <URow soon title="Sons d'entrée" description="Choisis un son du Soundboard à jouer automatiquement chaque fois que tu rejoins un salon vocal." />
      </USection>

      <USection id="voice-advanced" title="Avancé">
        <URow title="Réinitialiser tous les paramètres vocaux et vidéo" description="Retourne aux paramètres vocaux et vidéo par défaut.">
          <UButton
            tone="danger-outline"
            onClick={() => {
              voice.setMicVolume(100);
              voice.setOutputVolume(100);
              voice.setNoiseSuppression('high');
              voice.setVadSensitivity('medium');
              voice.setInputDeviceId('default');
              if (voice.isPushToTalkMode) voice.togglePushToTalkMode();
              update({ voice: DEFAULT_USER_SETTINGS.voice });
              toast.success('Paramètres vocaux réinitialisés');
            }}
          >
            Réinitialiser
          </UButton>
        </URow>
      </USection>
    </>
  );
}

/* --------------------------------------------------------------- Apparence -- */

const THEME_SWATCHES: { id: string; label: string; bg: string; apply: { theme: 'light' | 'dark' | 'system'; variant?: ThemeVariant } }[] = [
  { id: 'light', label: 'Clair', bg: '#ffffff', apply: { theme: 'light' } },
  { id: 'dark', label: 'Cendres', bg: '#323339', apply: { theme: 'dark', variant: 'dark' } },
  { id: 'darker', label: 'Sombre', bg: '#232428', apply: { theme: 'dark', variant: 'darker' } },
  { id: 'onyx', label: 'Onyx', bg: '#0b0b0d', apply: { theme: 'dark', variant: 'onyx' } },
];

/*
 * Curseur de zoom : la poignee suit le doigt sans attendre, mais le zoom reel
 * (qui refait toute la mise en page) n'est applique qu'* au relachement du curseur ou a une touche du clavier (sinon l'interface
 * bougerait sous la souris pendant le glissement).
 */
function ZoomSlider({ zoom, onCommit }: { zoom: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState<number | null>(null);
  const latest = useRef(zoom);
  if (draft === null) latest.current = zoom;
  const commit = () => {
    if (latest.current !== zoom) onCommit(latest.current);
    setDraft(null);
  };
  const commitRef = useRef(commit);
  commitRef.current = commit;
  useEffect(() => {
    // Relachement hors du curseur : le glissement se termine quand meme.
    const up = () => commitRef.current();
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, []);
  return (
    <div onKeyUp={commit} onBlur={commit}>
      <UMarkedSlider
        value={draft ?? zoom}
        marks={DESKTOP_ZOOM_STEPS}
        min={50}
        max={200}
        step={5}
        disabled={!isDesktopApp}
        format={(v) => `${v}%`}
        onChange={(v) => {
          latest.current = v;
          setDraft(v);
        }}
      />
    </div>
  );
}

export function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const { settings, update } = useUserSettings();
  const { goTo } = useUserSettingsNav();
  const ap = settings.appearance;
  const activeSwatch = theme === 'system' ? null : theme === 'light' ? 'light' : ap.theme_variant;

  return (
    <>
      <USection id="app-theme" title="Thème">
        <UToggle title="Identique au Thème de l'appareil" description="Fais correspondre le mode clair ou sombre de ton appareil." checked={theme === 'system'} onChange={(c) => setTheme(c ? 'system' : 'dark')} />
        <div>
          <p className="mb-2 text-sm font-medium text-white">Thèmes par défaut</p>
          <div className="flex gap-3">
            {THEME_SWATCHES.map((s) => (
              <Tooltip key={s.id}>
              <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={s.label}
                aria-pressed={activeSwatch === s.id}
                onClick={() => {
                  setTheme(s.apply.theme);
                  if (s.apply.variant) update({ appearance: { theme_variant: s.apply.variant } });
                }}
                className={cn('relative w-12 h-12 rounded-lg border-2 transition-colors', activeSwatch === s.id ? 'border-primary' : 'border-white/[0.12] hover:border-white/30')}
                style={{ background: s.bg }}
              >
                {activeSwatch === s.id && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Check className="w-3 h-3 text-white" strokeWidth={3} /></span>
                )}
              </button>
              </TooltipTrigger>
              <TooltipContent side="top">{s.label}</TooltipContent>
              </Tooltip>
            ))}
            <Tooltip>
            <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Synchroniser avec l'appareil"
              onClick={() => setTheme('system')}
              className={cn('w-12 h-12 rounded-lg border-2 flex items-center justify-center text-white', theme === 'system' ? 'border-primary' : 'border-white/[0.12] hover:border-white/30')}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            </TooltipTrigger>
            <TooltipContent side="top">Synchroniser avec l'appareil</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <CustomThemeBanner />
        <URelated icon={<PersonStanding className="w-5 h-5" />} title="Accessibilité" description="Change la saturation des couleurs, active le mode contraste élevé, et plus" onClick={() => goTo('accessibility', 'a11y-color')} />
        <CategoryCaseSection />
      </USection>

      <USection id="app-icon" title="Icône de l'appli">
        <URow soon title="Icône de l'application" description="Modifie l'icône de l'app sur ton appareil." />
      </USection>

      <USection id="app-messages" title="Messages">
        <p className="text-base font-medium text-white">Montre des images, des vidéos et des lolcats...</p>
        <UToggle title="Lorsqu'ils sont envoyés comme liens dans le salon" description="Lecteurs YouTube, Twitch et autres médias intégrés." checked={ap.show_link_media} onChange={(c) => update({ appearance: { show_link_media: c } })} />
        <UToggle title="Lorsqu'ils sont uploadés directement" checked={ap.show_uploaded_media} onChange={(c) => update({ appearance: { show_uploaded_media: c } })} />
        <UToggle title="Afficher les intégrations et aperçus de lien" checked={ap.show_embeds} onChange={(c) => update({ appearance: { show_embeds: c } })} />
        <UToggle title="Afficher les réactions émoji" checked={ap.show_reactions} onChange={(c) => update({ appearance: { show_reactions: c } })} />
        <URow title="Afficher les spoilers">
          <div className="w-[220px]">
            <USelect
              value={ap.spoilers}
              onChange={(s) => update({ appearance: { spoilers: s } })}
              options={[
                { value: 'click', label: 'En cliquant' },
                { value: 'hover', label: 'Au survol' },
                { value: 'always', label: 'Toujours' },
              ]}
            />
          </div>
        </URow>
        <UToggle
          title={<span className="flex items-center gap-2">Afficher les serveurs favoris <span className="rounded-[4px] bg-[#5865f2] px-1 text-[10px] font-semibold uppercase leading-4 text-white">Bêta</span></span>}
          description={<>Tes favoris restent enregistrés, même si tu désactives cette option. <span className="text-[hsl(var(--text-link))]">En savoir plus.</span></>}
          checked={settings.favorites.enabled}
          onChange={(c) => update({ favorites: { enabled: c } })}
        />
        <URelated icon={<PersonStanding className="w-5 h-5" />} title="Accessibilité" description="Ajuste la densité visuelle des messages de chat et de l'interface utilisateur" onClick={() => goTo('accessibility', 'a11y-density')} />
      </USection>

      <USection id="app-chatbox" title="Boîte de discussion">
        <UToggle title="Afficher un aperçu des émojis, des mentions et de la syntaxe Markdown pendant que tu écris" checked={ap.markdown_preview} onChange={(c) => update({ appearance: { markdown_preview: c } })} />
        <UToggle title="Afficher le bouton Envoyer un message" description="Le bouton reste visible même quand le message est vide." checked={ap.send_button} onChange={(c) => update({ appearance: { send_button: c } })} />
      </USection>

      <USection id="app-search" title="Rechercher">
        <URadioGroup
          label="Par défaut, la recherche dans les MP..."
          value={ap.dm_search}
          onChange={(d) => update({ appearance: { dm_search: d } })}
          disabled
          options={[
            { value: 'selected', label: 'Recherche uniquement dans les MP sélectionnés' },
            { value: 'all', label: 'Recherche dans tous mes MP' },
          ]}
        />
        <p className="text-xs text-muted-foreground">Bientôt disponible : la recherche porte aujourd'hui sur la conversation ouverte.</p>
      </USection>

      <USection id="app-streamer" title="Mode streamer">
        <UToggle soon checked={false} title="Activer le mode streamer" description="Le mode streamer masque tes informations personnelles pour que les autres personnes qui regardent ton stream ne puissent pas les voir." />
      </USection>
    </>
  );
}

/* ---------------------------------------------------------- Accessibilite -- */

function A11yPreview() {
  const { profile } = useAuth();
  const name = profile?.display_name || profile?.username || 'Toi';
  const now = formatClock(new Date());
  const avatar = profile?.avatar_url;
  const Av = () =>
    avatar ? <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" /> : <span className="w-10 h-10 rounded-full bg-primary shrink-0" />;
  return (
    <div className="sticky top-0 z-10 -mx-1 px-1 pt-2 pb-4 bg-background">
      <p className="mb-2 text-sm font-medium text-muted-foreground">Aperçu</p>
      <div className="message-preview rounded-lg border border-white/[0.08] p-4 space-y-4">
        <div className="message-hover flex gap-4">
          <Av />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[#c597ff]">{name} <span className="ml-1 text-xs font-normal text-muted-foreground">{now}</span></p>
            <div className="markdown-content text-foreground">qu'est-ce qui est arrivé à tous les haricots</div>
            <div className="message-reactions mt-1 flex gap-1">
              <span className="h-6 px-2 rounded-md border border-primary bg-primary/15 text-sm flex items-center gap-1">🌱 3</span>
              <span className="h-6 px-2 rounded-md bg-[hsl(var(--button-secondary))] text-sm flex items-center gap-1">🫘 1</span>
            </div>
          </div>
        </div>
        <div className="message-hover message-group-start flex gap-4">
          <Av />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-[#c597ff]">{name} <span className="ml-1 text-xs font-normal text-muted-foreground">{now}</span></p>
            <div className="markdown-content text-foreground">voici un lien <a href="#" onClick={(e) => e.preventDefault()} className="text-[hsl(var(--text-link))]">https://example.com/accessibilite</a></div>
          </div>
          <span className="self-end h-8 px-4 rounded-md bg-primary text-sm font-medium text-white flex items-center">Bouton d'exemple</span>
        </div>
      </div>
    </div>
  );
}

export function AccessibilityPage() {
  const { settings, update } = useUserSettings();
  const { goTo } = useUserSettingsNav();
  const a = settings.accessibility;
  const ttsPreview = () => {
    if (!('speechSynthesis' in window)) return toast.error("La synthèse vocale n'est pas prise en charge par ce navigateur");
    const u = new SpeechSynthesisUtterance("Voici un aperçu de la vitesse de lecture des messages.");
    u.lang = appLocale();
    u.rate = a.tts_rate;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  };

  return (
    <>
      <A11yPreview />
      <USection id="a11y-text" title="Lisibilité du texte">
        <div>
          <p className="text-base font-medium text-white">Zoom de l'application</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isDesktopApp ? "Agrandit ou réduit toute l'interface. Ctrl + « + » / « − » / « 0 » fonctionnent aussi." : "Disponible dans l'application de bureau : dans le navigateur, utilise le zoom de ta page (Ctrl + molette)."}
          </p>
          <ZoomSlider zoom={a.zoom} onCommit={(v) => update({ accessibility: { zoom: v } })} />
        </div>
        <div>
          <p className="text-base font-medium text-white">Taille du texte dans le chat</p>
          <p className="mt-1 text-sm text-muted-foreground">Ajuste la taille de la police du chat.</p>
          <UMarkedSlider value={a.font_size} marks={[12, 14, 15, 16, 18, 20, 24]} min={12} max={24} format={(v) => `${v}px`} onChange={(v) => update({ accessibility: { font_size: v } })} />
        </div>
        <UToggle title="Toujours souligner les liens" description="Fait davantage ressortir les liens." checked={a.underline_links} onChange={(c) => update({ accessibility: { underline_links: c } })} />
      </USection>

      <USection id="a11y-density" title="Densité visuelle">
        <URadioGroup
          label="Densité de l'interface"
          description="Ajuste l'espacement des listes de salons."
          value={a.density}
          onChange={(d) => update({ accessibility: { density: d } })}
          options={[
            { value: 'compact', label: 'Compacte' },
            { value: 'default', label: 'Par défaut' },
            { value: 'spacious', label: 'Spacieuse' },
          ]}
        />
        <URadioGroup
          label="Affichage des messages de discussion"
          description="Bientôt disponible : l'affichage compact des messages arrive prochainement."
          value="default"
          onChange={() => undefined}
          disabled
          options={[
            { value: 'default', label: 'Par défaut' },
            { value: 'compact', label: 'Compacte' },
          ]}
        />
        <div>
          <p className="text-base font-medium text-white">Espacement entre les groupes de messages</p>
          <p className="mt-1 text-sm text-muted-foreground">Ajuste l'espacement entre les groupes de messages.</p>
          <UMarkedSlider value={a.group_spacing} marks={[0, 4, 8, 16, 24]} min={0} max={24} format={(v) => `${v}px`} onChange={(v) => update({ accessibility: { group_spacing: v } })} />
        </div>
      </USection>

      <USection id="a11y-color" title="Couleur et contraste">
        <div>
          <p className="text-base font-medium text-white">Saturation</p>
          <p className="mt-1 text-sm text-muted-foreground">Réduit la saturation des couleurs de l'appli pour les personnes sensibles aux couleurs. Les images et vidéos gardent leurs couleurs.</p>
          <UMarkedSlider value={a.saturation} marks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]} step={10} format={(v) => `${v}%`} onChange={(v) => update({ accessibility: { saturation: v } })} />
        </div>
        <UToggle title="Activer le mode Contraste élevé" description="Améliore la visibilité avec des textes plus clairs et des bordures plus marquées." checked={a.high_contrast} onChange={(c) => update({ accessibility: { high_contrast: c } })} />
        <URow title="Couleurs de rôle" description="Choisis comment tu souhaites que les couleurs de rôle soient affichées.">
          <div className="w-[240px]">
            <USelect
              value={a.role_colors}
              onChange={(r) => update({ accessibility: { role_colors: r } })}
              options={[
                { value: 'names', label: 'Dans les noms' },
                { value: 'beside', label: 'À côté des noms' },
                { value: 'none', label: 'Ne pas afficher les couleurs de rôle' },
              ]}
            />
          </div>
        </URow>
        <URelated icon={<RefreshCw className="w-5 h-5" />} title="Apparence" description="Changer le thème de ton application" onClick={() => goTo('appearance', 'app-theme')} />
      </USection>

      <USection id="a11y-motion" title="Mouvement réduit">
        <UToggle title="Activer Mouvement réduit" description="Réduis le nombre et l'intensité des animations, effets de survol et autres effets de mouvement." checked={a.reduced_motion} onChange={(c) => update({ accessibility: { reduced_motion: c } })} />
        <UToggle title="Synchroniser avec les paramètres de l'ordinateur" description="Suit le réglage « Réduire les animations » de ton système." checked={a.sync_reduced_motion} onChange={(c) => update({ accessibility: { sync_reduced_motion: c } })} />
      </USection>

      <USection id="a11y-audio" title="Audio et lecteur d'écran">
        <div>
          <p className="text-base font-medium text-white">Vitesse synthèse vocale</p>
          <p className="mt-1 text-sm text-muted-foreground">Contrôle la vitesse à laquelle le texte est lu à haute voix.</p>
          <UMarkedSlider value={a.tts_rate} marks={[0.5, 1, 1.5, 2, 2.5, 3]} min={0.5} max={3} step={0.25} format={(v) => `x${v}`} onChange={(v) => update({ accessibility: { tts_rate: v } })} />
          <UButton tone="primary" className="mt-2 inline-flex items-center gap-1.5" onClick={ttsPreview}><Play className="w-3.5 h-3.5 fill-white" /> Aperçu</UButton>
        </div>
      </USection>
    </>
  );
}

/* ----------------------------------------------------------------- Systeme -- */

function Kbd({ k }: { k: string }) {
  return <kbd className="min-w-6 h-6 px-1.5 rounded bg-[hsl(var(--button-secondary))] text-[11px] font-bold uppercase text-white flex items-center justify-center">{k}</kbd>;
}

export function SystemPage() {
  const [showMarkdown, setShowMarkdown] = useState(false);
  const clearCache = () => {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('cache:') || k.startsWith('rq-')).forEach((k) => localStorage.removeItem(k));
      indexedDB.databases?.().then((dbs) => dbs.forEach((d) => d.name && indexedDB.deleteDatabase(d.name)));
      toast.success('Cache local vidé : recharge la page pour repartir de zéro');
    } catch {
      toast.error('Impossible de vider le cache');
    }
  };
  return (
    <>
      <USection id="sys-custom" title="Raccourcis clavier personnalisés" description="Les raccourcis clavier sont des raccourcis personnalisés qui te permettent d'effectuer des actions spécifiques sans avoir besoin de cliquer dans les menus.">
        <UBanner>La personnalisation des raccourcis clavier n'est pas encore disponible dans l'app.</UBanner>
      </USection>
      <USection id="sys-default" title="Raccourcis clavier par défaut">
        {KEYBOARD_SHORTCUTS.map((g) => (
          <div key={g.category}>
            <p className="mb-2 text-lg font-semibold text-white">{g.category}</p>
            <div className="rounded-lg bg-[hsl(var(--surface-card))] divide-y divide-white/[0.06]">
              {g.shortcuts.map((s) => (
                <div key={s.description} className="flex items-center gap-4 h-12 px-4">
                  <span className="flex-1 text-base text-white">{s.description}</span>
                  <span className="flex items-center gap-1">
                    {s.keys.map((k) => <Kbd key={k} k={k} />)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </USection>
      <USection id="sys-app" title="Application">
        <URow title="Installer l'application" description="Installe l'app sur ton appareil depuis le menu de ton navigateur (« Installer » / « Ajouter à l'écran d'accueil »).">
          <Download className="w-5 h-5 text-[hsl(var(--icon-default))]" />
        </URow>
        <URow title="Vider le cache local" description="Supprime les données mises en cache sur cet appareil (serveurs, messages, profils).">
          <UButton tone="danger-outline" onClick={clearCache}><span className="inline-flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Vider</span></UButton>
        </URow>
        <URow title="Aide · Markdown" description="Toute la syntaxe de mise en forme des messages.">
          <UButton onClick={() => setShowMarkdown((v) => !v)}>{showMarkdown ? 'Masquer' : 'Afficher'}</UButton>
        </URow>
        {showMarkdown && <MarkdownHelpPage />}
      </USection>
    </>
  );
}

/* --------------------------------------------------------- Langue et heure -- */

export function LanguagePage() {
  const { settings, update } = useUserSettings();
  return (
    <USection id="language-main">
      <div>
        <p className="text-base font-medium text-white">Sélectionne une langue</p>
        <p className="mt-1 mb-2 text-sm text-muted-foreground">Choisis la langue que tu veux que l'app utilise.</p>
        <LanguageSelect value={settings.language.locale} onChange={(locale) => update({ language: { locale } })} />
      </div>
      <URadioGroup
        label="Format de l'heure"
        value={settings.language.time_format}
        onChange={(t) => update({ language: { time_format: t } })}
        options={[
          { value: 'auto', label: 'Automatique' },
          { value: '12', label: '12 heures' },
          { value: '24', label: '24 heures' },
        ]}
      />
      <p className="text-sm text-muted-foreground">Exemple : {formatClock(new Date())}</p>
    </USection>
  );
}
