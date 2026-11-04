import { useEffect, useState } from "react";
import { Hand, MicOff, PhoneOff } from "@/components/icons/discord/lucide";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { markStageWelcomeSeen } from "./stageWelcome";

/*
 * Fenetres du salon Conference, reprises de la video de reference :
 * - accueil (premiere visite),
 * - sujet (demarrer / modifier),
 * - confirmation de fin pour tout le monde.
 * Les fenetres "illustrees" ont un bandeau violet degrade avec un micro.
 */

/** Micro stylise (dessin propre a l'app, pas l'illustration de Discord). */
export function StageMicIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <linearGradient id="stage-mic-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b3fd8" />
          <stop offset="1" stopColor="#1b1d7a" />
        </linearGradient>
        <linearGradient id="stage-mic-band" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c86bff" />
          <stop offset="1" stopColor="#8a3ff0" />
        </linearGradient>
      </defs>
      <ellipse cx="62" cy="104" rx="26" ry="6" fill="#000" opacity="0.25" />
      <ellipse cx="58" cy="100" rx="20" ry="6" fill="#3f8cff" />
      <ellipse cx="58" cy="98" rx="20" ry="6" fill="#5865f2" />
      <rect x="55" y="74" width="6" height="24" rx="3" fill="#7b5cff" />
      <path d="M40 58 v8 a18 18 0 0 0 36 0 v-8" fill="none" stroke="#38d9f5" strokeWidth="4" strokeLinecap="round" />
      <g transform="rotate(-18 58 44)">
        <rect x="42" y="10" width="32" height="56" rx="16" fill="url(#stage-mic-body)" />
        <rect x="42" y="38" width="32" height="18" fill="url(#stage-mic-band)" />
        <circle cx="50" cy="47" r="4" fill="#ff8ad8" />
      </g>
    </svg>
  );
}

function IllustratedHeader() {
  return (
    <div className="relative h-[150px] -mb-2 flex items-end justify-center bg-gradient-to-b from-[#6b3fd0]/80 via-[#4a3a8f]/40 to-transparent">
      <StageMicIllustration className="w-[120px] h-[120px] -mb-1" />
    </div>
  );
}

export function StageWelcomeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const close = () => {
    markStageWelcomeSeen();
    onClose();
  };
  const rows = [
    { icon: MicOff, iconClass: "text-[hsl(var(--voice-muted))]", text: "Ton micro sera coupé jusqu'à ce que tu sois invité(e) à parler." },
    { icon: PhoneOff, iconClass: "text-white", text: "Tu peux partir et revenir à tout moment sans faire de bruit." },
    { icon: Hand, iconClass: "text-white", text: "Demande à prendre la parole pour rejoindre la discussion !" },
  ];
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
        <IllustratedHeader />
        <div className="px-8 pb-8">
          <DialogTitle className="text-center text-2xl font-semibold text-white">
            Bienvenue dans les conférences !
          </DialogTitle>
          <DialogDescription className="sr-only">Comment fonctionne un salon de conférence</DialogDescription>
          <ul className="mt-6 space-y-5">
            {rows.map(({ icon: Icon, iconClass, text }) => (
              <li key={text} className="flex items-center gap-4">
                <span className="w-10 h-10 shrink-0 rounded-full bg-black/30 flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${iconClass}`} />
                </span>
                <span className="text-base leading-5 text-foreground">{text}</span>
              </li>
            ))}
          </ul>
          <Button className="w-full mt-8 h-11 text-base" onClick={close}>
            Compris !
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface StageTopicModalProps {
  open: boolean;
  mode: "start" | "edit";
  initialTopic?: string;
  pending?: boolean;
  onClose: () => void;
  onSubmit: (topic: string) => void;
}

export function StageTopicModal({ open, mode, initialTopic = "", pending, onClose, onSubmit }: StageTopicModalProps) {
  const [topic, setTopic] = useState(initialTopic);
  useEffect(() => {
    if (open) setTopic(initialTopic);
  }, [open, initialTopic]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) onSubmit(topic.trim());
  };

  const input = (
    <>
      <label htmlFor="stage-topic" className="block mb-2 text-base font-semibold text-foreground">
        Sujet de la conférence <span className="text-destructive">*</span>
      </label>
      <input
        id="stage-topic"
        autoFocus
        value={topic}
        maxLength={120}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Fin du débat : un régime équilibré est mieux qu'un régime 100 % pizza"
        className="w-full h-11 px-3 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] focus:border-primary text-base text-foreground placeholder:text-[hsl(var(--text-placeholder))] outline-none transition-colors"
      />
    </>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
        {mode === "start" ? (
          <form onSubmit={submit}>
            <IllustratedHeader />
            <div className="px-8 pb-8">
              <DialogTitle className="text-center text-2xl font-semibold text-white">De quoi veux-tu discuter ?</DialogTitle>
              <DialogDescription className="mt-2 text-center text-base text-muted-foreground">
                Écris un sujet pour commencer ta conférence.
              </DialogDescription>
              <div className="mt-6">{input}</div>
              <div className="mt-8 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                <Button type="submit" disabled={!topic.trim() || pending}>Commencer la conférence</Button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={submit} className="p-6">
            <DialogTitle className="text-xl font-semibold text-white">Modifier la conférence</DialogTitle>
            <DialogDescription className="mt-1 mb-5 text-sm text-muted-foreground">Change le sujet</DialogDescription>
            {input}
            <div className="mt-6 flex flex-col gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
              <Button type="submit" disabled={!topic.trim() || pending}>Enregistrer les modifications</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function StageEndConfirm({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px] p-6 gap-0">
        <DialogTitle className="text-xl font-semibold leading-6 text-white pr-6">
          Veux-tu vraiment terminer la conférence pour tout le monde ?
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-muted-foreground">
          La conférence prendra immédiatement fin.
        </DialogDescription>
        <div className="mt-6 flex flex-col gap-2">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button variant="destructive" onClick={onConfirm}>Terminer la conférence</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
