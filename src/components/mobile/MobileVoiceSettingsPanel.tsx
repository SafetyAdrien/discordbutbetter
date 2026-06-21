import { motion } from 'framer-motion';
import { ChevronRight, Settings, EarOff, Video, UserPlus, Wrench } from 'lucide-react';
import { useState } from 'react';

interface Props {
  channelName: string;
  onClose: () => void;
  onInvite?: () => void;
}

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  divider?: boolean;
}

function ToggleRow({ icon, title, subtitle, value, onChange, divider }: ToggleRowProps) {
  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 flex justify-center text-muted-foreground shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground text-[15px]">{title}</div>
          <div className="text-[13px] text-muted-foreground leading-tight">{subtitle}</div>
        </div>
        <button
          type="button"
          onClick={() => onChange(!value)}
          aria-label={title}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${value ? 'bg-[hsl(var(--success))]' : 'bg-[hsl(var(--surface-3))]'}`}
        >
          <span
            className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center text-[hsl(var(--surface-3))] text-xs font-bold transition-all ${value ? 'left-[22px]' : 'left-0.5'}`}
          >
            {value ? '✓' : '✕'}
          </span>
        </button>
      </div>
      {divider && <div className="mx-4 h-px bg-white/5" />}
    </>
  );
}

export function MobileVoiceSettingsPanel({ channelName, onClose, onInvite }: Props) {
  const [deafen, setDeafen] = useState(false);
  const [onlyVideos, setOnlyVideos] = useState(false);
  const [debugOverlay, setDebugOverlay] = useState(false);

  return (
    <motion.div
      key="voice-settings-panel"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[60] bg-[hsl(var(--surface-1))] flex flex-col overflow-y-auto"
    >
      {/* Drag handle */}
      <div className="w-full pt-2 pb-1 flex justify-center shrink-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="w-10 h-1 rounded-full bg-white/20"
        />
      </div>

      {/* Header */}
      <div className="px-6 pt-6 pb-8 flex items-center justify-center gap-2 shrink-0">
        <span className="text-2xl">🌕</span>
        <h2 className="text-xl font-bold text-foreground truncate">{channelName}</h2>
      </div>

      <div className="flex-1 px-3 pb-8 space-y-4">
        {/* Channel Settings */}
        <button
          type="button"
          className="w-full flex items-center gap-3 bg-[hsl(var(--surface-2))] rounded-xl p-4 active:bg-[hsl(var(--surface-3))] transition-colors text-left"
        >
          <div className="flex-1 min-w-0">
            <div className="font-bold text-foreground">Channel Settings</div>
            <div className="text-[13px] text-muted-foreground">Edit preferences for this shared space</div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>

        {/* Voice Settings group */}
        <div className="bg-[hsl(var(--surface-2))] rounded-xl overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 active:bg-[hsl(var(--surface-3))] transition-colors text-left"
          >
            <div className="w-8 flex justify-center text-muted-foreground shrink-0">
              <Settings className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-foreground text-[15px]">Voice Settings</div>
              <div className="text-[13px] text-muted-foreground leading-tight">Adjust your personal voice &amp; video settings</div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </button>
          <div className="mx-4 h-px bg-white/5" />
          <ToggleRow
            icon={<EarOff className="w-6 h-6" />}
            title="Deafen"
            subtitle="Disables all sound"
            value={deafen}
            onChange={setDeafen}
            divider
          />
          <ToggleRow
            icon={<Video className="w-6 h-6" />}
            title="Only Show Videos"
            subtitle="We won't show non-video participants"
            value={onlyVideos}
            onChange={setOnlyVideos}
          />
        </div>

        {/* Members */}
        <div>
          <div className="px-2 pt-2 pb-2 text-[13px] font-semibold text-muted-foreground">0 Members</div>
          <button
            type="button"
            onClick={onInvite}
            className="w-full flex items-center gap-3 bg-[hsl(var(--surface-2))] rounded-xl p-4 active:bg-[hsl(var(--surface-3))] transition-colors text-left"
          >
            <UserPlus className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex-1 font-bold text-foreground">Invite a friend</div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </button>
        </div>

        {/* Developers */}
        <div>
          <div className="px-2 pt-2 pb-2 text-[13px] font-semibold text-muted-foreground">For Developers</div>
          <div className="bg-[hsl(var(--surface-2))] rounded-xl overflow-hidden">
            <ToggleRow
              icon={<Wrench className="w-6 h-6" />}
              title="Show Activity Debug Overlay"
              subtitle=""
              value={debugOverlay}
              onChange={setDebugOverlay}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
