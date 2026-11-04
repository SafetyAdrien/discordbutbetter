import { useEffect, useMemo, useState } from "react";
import { CirclePlus, GripHorizontal, Circle } from "lucide-react";
import { ArrowLeft, ArrowRight, Check, ChevronUp, Smile, Trash2, Folder } from "@/components/icons/discord/lucide";
import { AlertCircle, X, ChevronDown, CheckCircle2 } from "@/components/icons/serverSettingsIcons";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EmojiStickerPicker } from "@/components/chat/EmojiStickerPicker";
import { channelTypeIcon } from "@/components/layout/searchIcons";
import { useChannels } from "@/hooks/useChannels";
import { useServerRoles } from "@/hooks/useRoles";
import { useServerSettings } from "@/hooks/useServerSettings";
import {
  emptyOnboarding,
  useSaveServerOnboarding,
  useServerOnboarding,
  type OnboardingGuide,
  type OnboardingOption,
  type OnboardingPrompt,
} from "@/hooks/useServerOnboarding";
import { cn } from "@/lib/utils";
import { ComingSoonBadge } from "./SettingsUI";
import { SecuritySetupPanel } from "./SecuritySettings";
import { MemberOnboardingDialog } from "@/components/onboarding/MemberOnboarding";

/*
 * "Processus d'accueil" (video de reference) : page d'introduction puis
 * assistant en cinq etapes (Tests de securite, Salons par defaut,
 * Questionnaire de personnalisation, Guide du serveur, Evaluation).
 * Chaque "Suivant" enregistre le brouillon ; l'activation rend l'accueil
 * visible aux nouveaux membres (MemberOnboarding + complete_server_onboarding).
 */

const STEPS = ["1. Tests de sécurité", "2. Salons par défaut", "3. Questionnaire de personnalisation", "4. Guide du serveur", "5. Évaluation"];
const TIPS: { title: string; text: string }[] = [
  { title: "Vérifions ta configuration de sécurité", text: "Les protections de ton serveur sont regroupées ici. Vérifie le niveau de vérification et active les règles AutoMod adaptées." },
  { title: "Quels sont les salons que chaque membre devrait avoir ?", text: "Choisis au moins un salon par défaut. Les membres pourront choisir d'autres salons grâce aux questions de personnalisation. Et on montrera aussi tous les nouveaux salons qui seront créés." },
  { title: "Pose des questions pour aider tes membres à choisir des salons et des rôles supplémentaires.", text: "Essaye de poser des questions comme « Que souhaites-tu faire ici ? » ou « Quels sont tes hobbies ? » pour personnaliser davantage la liste des salons de chaque membre." },
  { title: "Prépare le guide du serveur", text: "Un message de bienvenue, quelques tâches et des ressources : c'est la première page que verront tes nouveaux membres." },
  { title: "Dernière vérification", text: "Vérifie que tout est prêt, puis active le processus d'accueil." },
];
const QUESTION_IDEAS = ["Quels salons hors-sujet t'intéressent ?", "Quel type de notifications souhaites-tu recevoir ?", "Quel genre d'intervenant(e) es-tu ?", "Que veux-tu faire dans cette communauté ?"];
const TESTIMONIALS = [
  { quote: "Le processus d'accueil permet aux nouveaux arrivants d'ajuster leur propre expérience sur le serveur suivant la façon dont ils veulent participer. Cela a renforcé notre rétention de plus de 10 % depuis son activation !", who: "Howl, administrateur de Harry Potter" },
  { quote: "Nos nouveaux membres trouvent tout de suite les salons qui les intéressent, au lieu de se perdre dans une liste de cinquante salons.", who: "Mika, modératrice d'une communauté de jeux" },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const fieldCls = "w-full h-10 px-3 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] focus:border-primary text-base text-foreground placeholder:text-[hsl(var(--text-placeholder))] outline-none transition-colors";

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn("w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors", checked ? "bg-primary border-primary" : "border-[hsl(var(--header-icon))]")}>
      {checked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
    </button>
  );
}

function StepTip({ step, onDone }: { step: number; onDone: () => void }) {
  const tip = TIPS[step];
  return (
    <div className="fixed right-8 bottom-28 z-[60] w-[300px] p-4 rounded-lg bg-[hsl(var(--popover))] border border-white/[0.06] shadow-2xl animate-step-in">
      <p className="text-xs font-medium text-muted-foreground">Étape {step + 1}</p>
      <p className="mt-1 text-base font-bold text-white">{tip.title}</p>
      <p className="mt-2 text-sm text-foreground">{tip.text}</p>
      <Button size="sm" className="mt-3" onClick={onDone}>Compris !</Button>
    </div>
  );
}

/* ----------------------------------------------------------- intro page -- */

function Intro({ onStart }: { onStart: () => void }) {
  const [i, setI] = useState(0);
  const t = TESTIMONIALS[i];
  return (
    <div className="pb-24">
      <div className="h-[220px] flex items-end justify-center gap-6 select-none" aria-hidden="true">
        <span className="text-[72px] -rotate-6">🏝️</span>
        <span className="text-[96px]">🎪</span>
        <span className="text-[72px] rotate-6">🌴</span>
      </div>
      <div className="mt-6 text-center">
        <h2 className="text-2xl font-bold text-white">Accueille tes nouveaux membres grâce au processus d'accueil !</h2>
        <p className="mt-2 text-base text-foreground">Personnalise les salons et les rôles de tes nouveaux membres. Donne-leur le parfait premier aperçu.</p>
        <Button className="mt-5" onClick={onStart}>Y jeter un œil</Button>
      </div>
      <div className="h-px my-8 bg-[hsl(var(--border-subtle))]" />
      <div className="rounded-xl bg-[hsl(var(--card))] px-10 py-8">
        <span className="text-5xl leading-none text-muted-foreground font-serif">“</span>
        <p className="-mt-3 text-center text-base text-foreground">{t.quote}</p>
        <p className="mt-3 text-center text-sm text-foreground">{t.who}</p>
        <div className="mt-5 flex justify-center gap-3">
          <Button variant="secondary" size="icon" aria-label="Précédent" onClick={() => setI((i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}><ArrowLeft className="w-4 h-4" /></Button>
          <Button variant="secondary" size="icon" aria-label="Suivant" onClick={() => setI((i + 1) % TESTIMONIALS.length)}><ArrowRight className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- answer editor -- */

interface ChannelLite { id: string; name: string; type: string | null }
interface CategoryLite { id: string; name: string; channels: ChannelLite[] }

function AnswerDialog({
  questionLabel,
  title,
  initial,
  categories,
  roles,
  onSave,
  onDelete,
  onClose,
}: {
  questionLabel: string;
  title: string;
  initial: OnboardingOption | null;
  categories: CategoryLite[];
  roles: { id: string; name: string; color: string | null }[];
  onSave: (o: OnboardingOption) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [opt, setOpt] = useState<OnboardingOption>(initial ?? { id: uid(), title: "", description: "", emoji: null, channel_ids: [], role_ids: [] });
  const [chQuery, setChQuery] = useState("");
  const [roleQuery, setRoleQuery] = useState("");
  const [chOpen, setChOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const allChannels = categories.flatMap((c) => c.channels);
  const toggle = (k: "channel_ids" | "role_ids", id: string) =>
    setOpt((o) => ({ ...o, [k]: o[k].includes(id) ? o[k].filter((x) => x !== id) : [...o[k], id] }));
  const chipCls = "inline-flex items-center gap-1 h-7 px-2 rounded-md bg-[hsl(var(--button-secondary))] text-sm text-white";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-visible">
        <div className="px-6 pt-6">
          <DialogTitle className="text-xl font-semibold text-white">{questionLabel}</DialogTitle>
          <DialogDescription className="mt-1 text-base text-foreground">{title || "Question sans titre"}</DialogDescription>
          <p className="mt-5 mb-2 text-base font-medium text-white">1. Ajoute une réponse <span className="text-destructive">*</span></p>
          <input autoFocus value={opt.title} maxLength={50} onChange={(e) => setOpt({ ...opt, title: e.target.value })} placeholder="Saisir une réponse..." className={fieldCls} />
          <input value={opt.description} maxLength={100} onChange={(e) => setOpt({ ...opt, description: e.target.value })} placeholder="Entrer une description... (facultatif)" className={cn(fieldCls, "mt-2")} />
          <div className="h-px my-5 bg-[hsl(var(--border-subtle))]" />
          <p className="mb-2 text-base font-medium text-white">2. Attribue des salons et/ou des rôles</p>
          <div className="relative">
            <div className={cn(fieldCls, "h-auto min-h-10 py-1.5 flex flex-wrap items-center gap-1")} onClick={() => setChOpen(true)}>
              {opt.channel_ids.map((id) => {
                const c = allChannels.find((x) => x.id === id);
                if (!c) return null;
                const Icon = channelTypeIcon[c.type ?? "text"] ?? channelTypeIcon.text;
                return (
                  <span key={id} className={chipCls}>
                    <Icon className="w-3.5 h-3.5" />{c.name}
                    <button type="button" aria-label={`Retirer ${c.name}`} onClick={(e) => { e.stopPropagation(); toggle("channel_ids", id); }}><X className="w-3 h-3" /></button>
                  </span>
                );
              })}
              <input value={chQuery} onFocus={() => setChOpen(true)} onBlur={() => setTimeout(() => setChOpen(false), 150)} onChange={(e) => setChQuery(e.target.value)} placeholder={opt.channel_ids.length ? "" : "Saisir les salons..."} className="flex-1 min-w-[120px] bg-transparent outline-none text-base" />
            </div>
            {chOpen && (
              <div className="absolute z-10 left-0 right-0 mt-1 max-h-[220px] overflow-y-auto scrollbar-thin p-3 rounded-lg bg-[hsl(var(--popover))] border border-white/[0.06] shadow-xl">
                <p className="mb-2 text-sm font-semibold text-white">Salons</p>
                {categories.map((cat) => {
                  const list = cat.channels.filter((c) => c.name.toLowerCase().includes(chQuery.toLowerCase()));
                  if (!list.length) return null;
                  return (
                    <div key={cat.id} className="mb-2 space-y-1.5">
                      <span className={chipCls}><Folder className="w-3.5 h-3.5" />{cat.name}</span>
                      {list.map((c) => {
                        const Icon = channelTypeIcon[c.type ?? "text"] ?? channelTypeIcon.text;
                        const on = opt.channel_ids.includes(c.id);
                        return (
                          <div key={c.id} className="pl-3">
                            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => toggle("channel_ids", c.id)} className={cn(chipCls, on && "bg-primary")}>
                              <Icon className="w-3.5 h-3.5" />{c.name}{on && <Check className="w-3 h-3" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Seuls les salons auxquels la personne a déjà accès lui seront montrés.</p>
          <div className="relative mt-3">
            <div className={cn(fieldCls, "h-auto min-h-10 py-1.5 flex flex-wrap items-center gap-1")} onClick={() => setRoleOpen(true)}>
              {opt.role_ids.map((id) => {
                const r = roles.find((x) => x.id === id);
                if (!r) return null;
                return (
                  <span key={id} className={chipCls}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color ?? "#99aab5" }} />{r.name}
                    <button type="button" aria-label={`Retirer ${r.name}`} onClick={(e) => { e.stopPropagation(); toggle("role_ids", id); }}><X className="w-3 h-3" /></button>
                  </span>
                );
              })}
              <input value={roleQuery} onFocus={() => setRoleOpen(true)} onBlur={() => setTimeout(() => setRoleOpen(false), 150)} onChange={(e) => setRoleQuery(e.target.value)} placeholder={opt.role_ids.length ? "" : "Saisir les rôles..."} className="flex-1 min-w-[120px] bg-transparent outline-none text-base" />
            </div>
            {roleOpen && (
              <div className="absolute z-10 left-0 right-0 mt-1 max-h-[180px] overflow-y-auto scrollbar-thin p-2 rounded-lg bg-[hsl(var(--popover))] border border-white/[0.06] shadow-xl">
                {roles.filter((r) => r.name.toLowerCase().includes(roleQuery.toLowerCase())).map((r) => {
                  const on = opt.role_ids.includes(r.id);
                  return (
                    <button key={r.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => toggle("role_ids", r.id)} className="w-full flex items-center gap-2 h-8 px-2 rounded text-left text-sm text-foreground hover:bg-[hsl(var(--interactive-background-hover))]">
                      <span className="w-3 h-3 rounded-full" style={{ background: r.color ?? "#99aab5" }} />
                      <span translate="no" className="flex-1">{r.name}</span>
                      {on && <Check className="w-4 h-4" />}
                    </button>
                  );
                })}
                {roles.length === 0 && <p className="px-2 py-1 text-sm text-muted-foreground">Aucun rôle à attribuer.</p>}
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Les membres recevront ces rôles en choisissant cette réponse.</p>
          <p className="mt-5 text-base font-medium text-white">3. Choisis un emoji</p>
          <p className="text-xs text-muted-foreground">C'est facultatif, mais pourquoi ne pas rendre ta réponse plus amusante ?</p>
          <div className="mt-2 flex items-center gap-2">
            <EmojiStickerPicker
              serverId={null}
              onEmojiSelect={(emoji) => setOpt((o) => ({ ...o, emoji }))}
              trigger={
                <button type="button" aria-label="Choisir un émoji" className="w-10 h-10 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white">
                  {opt.emoji ? <span className="text-xl">{opt.emoji}</span> : <Smile className="w-5 h-5" />}
                </button>
              }
            />
            {opt.emoji && <button type="button" onClick={() => setOpt({ ...opt, emoji: null })} className="text-sm text-foreground hover:underline">Retirer</button>}
          </div>
        </div>
        <div className="mt-6 px-6 py-4 flex items-center bg-[hsl(var(--card))] rounded-b-lg">
          {onDelete && <button type="button" onClick={onDelete} className="text-sm font-medium text-[#f57976] hover:underline">Supprimer</button>}
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button disabled={!opt.title.trim()} onClick={() => onSave({ ...opt, title: opt.title.trim(), description: opt.description.trim() })}>Enregistrer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------- questions -- */

function QuestionCard({
  index,
  prompt,
  onChange,
  onDelete,
  onEditOption,
  showErrors,
}: {
  index: number;
  prompt: OnboardingPrompt;
  onChange: (p: OnboardingPrompt) => void;
  onDelete: () => void;
  onEditOption: (optionIndex: number | null) => void;
  showErrors: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="relative rounded-lg bg-[hsl(var(--card))] border border-white/[0.06] px-4 pt-3 pb-4">
      <GripHorizontal className="absolute left-1/2 -translate-x-1/2 top-1.5 w-4 h-4 text-muted-foreground" />
      <div className="flex items-center">
        <p className="text-base font-medium text-white">Question {index + 1}</p>
        <button type="button" aria-label={collapsed ? "Déplier" : "Replier"} onClick={() => setCollapsed((c) => !c)} className="ml-auto p-1 text-[hsl(var(--icon-default))] hover:text-white">
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
      {collapsed ? (
        <p className="mt-1 text-sm text-foreground truncate">{prompt.title || "Question sans titre"} · {prompt.options.length} réponse(s)</p>
      ) : (
        <>
          <input value={prompt.title} maxLength={100} onChange={(e) => onChange({ ...prompt, title: e.target.value })} placeholder="Entre une question..." className={cn(fieldCls, "mt-2")} />
          {!prompt.title && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">Voici quelques idées...</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {QUESTION_IDEAS.map((q) => (
                  <button key={q} type="button" onClick={() => onChange({ ...prompt, title: q })} className="h-7 px-2 rounded-md bg-[hsl(var(--button-secondary))] text-xs text-white hover:bg-[hsl(var(--interactive-background-selected))]">{q}</button>
                ))}
              </div>
            </div>
          )}
          <p className="mt-4 text-lg font-semibold text-white">Réponses disponibles — {prompt.options.length} sur 50</p>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {prompt.options.map((o, i) => (
              <button key={o.id} type="button" onClick={() => onEditOption(i)} className="flex items-center gap-3 h-[62px] px-4 rounded-lg border border-white/[0.08] hover:bg-[hsl(var(--interactive-background-hover))] text-left">
                {o.emoji && <span className="text-2xl">{o.emoji}</span>}
                <span className="min-w-0">
                  <span className="block text-base font-medium text-white truncate">{o.title}</span>
                  {o.description && <span className="block text-sm text-muted-foreground truncate">{o.description}</span>}
                </span>
              </button>
            ))}
            {prompt.options.length < 50 && (
              <button type="button" onClick={() => onEditOption(null)} className="flex items-center gap-3 h-[62px] px-4 rounded-lg border border-dashed border-white/[0.15] hover:bg-[hsl(var(--interactive-background-hover))] text-base font-medium text-white">
                <CirclePlus className="w-6 h-6 text-[hsl(var(--icon-default))]" /> Ajouter une réponse
              </button>
            )}
          </div>
          {showErrors && prompt.options.length === 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-[#f57976]"><AlertCircle className="w-4 h-4" /> Au moins une réponse requise</p>
          )}
          {showErrors && !prompt.title.trim() && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-[#f57976]"><AlertCircle className="w-4 h-4" /> La question doit avoir un titre</p>
          )}
          <div className="mt-4 flex items-center gap-6">
            <label className="flex items-center gap-2 text-base text-foreground"><Checkbox checked={prompt.multiple} onChange={(v) => onChange({ ...prompt, multiple: v })} label="Autoriser plusieurs réponses" /> Autoriser plusieurs réponses</label>
            <label className="flex items-center gap-2 text-base text-foreground"><Checkbox checked={prompt.required} onChange={(v) => onChange({ ...prompt, required: v })} label="Requis" /> Requis</label>
            <button type="button" aria-label="Supprimer la question" onClick={onDelete} className="ml-auto p-1 text-[hsl(var(--icon-default))] hover:text-[#f57976]"><Trash2 className="w-5 h-5" /></button>
          </div>
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- main -- */

export function OnboardingSettings({ serverId, onStepChange }: { serverId: string; onStepChange?: (step: number | null) => void }) {
  const { data: saved } = useServerOnboarding(serverId);
  const save = useSaveServerOnboarding(serverId);
  const { data: channelsData } = useChannels(serverId);
  const { data: roles = [] } = useServerRoles(serverId);
  const { data: settings } = useServerSettings(serverId);

  const [step, setStep] = useState<number | null>(null);
  const [draft, setDraft] = useState(() => saved ?? emptyOnboarding(serverId));
  const [loaded, setLoaded] = useState(false);
  const [tipSeen, setTipSeen] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<{ prompt: number; option: number | null } | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (saved && !loaded) {
      setDraft(saved);
      setLoaded(true);
      if (saved.enabled) setStep(4);
    }
  }, [saved, loaded]);
  useEffect(() => onStepChange?.(step), [step, onStepChange]);
  useEffect(() => () => onStepChange?.(null), [onStepChange]);

  const categories: CategoryLite[] = useMemo(() => {
    if (!channelsData) return [];
    return [
      ...(channelsData.orphanChannels.length ? [{ id: "none", name: "Sans catégorie", channels: channelsData.orphanChannels }] : []),
      ...channelsData.categories.map((c) => ({ id: c.id, name: c.name, channels: c.channels })),
    ].map((c) => ({ ...c, channels: c.channels.map((ch) => ({ id: ch.id, name: ch.name, type: ch.type })) }));
  }, [channelsData]);
  const allChannels = categories.flatMap((c) => c.channels);
  const assignableRoles = roles.filter((r) => !r.is_default).map((r) => ({ id: r.id, name: r.name, color: r.color }));

  const defaults = new Set(draft.default_channel_ids);
  const chattable = allChannels.filter((c) => defaults.has(c.id) && (c.type === "text" || c.type === "announcement" || c.type === "forum"));
  const promptsValid = draft.prompts.every((p) => p.title.trim() && p.options.length > 0);
  const covered = new Set([...draft.default_channel_ids, ...draft.prompts.flatMap((p) => p.options.flatMap((o) => o.channel_ids))]);
  const uncovered = allChannels.filter((c) => !covered.has(c.id));
  const guide: OnboardingGuide = draft.guide ?? {};

  const canNext = step === 1 ? chattable.length > 0 : step === 2 ? promptsValid : true;
  const persist = (patch: Partial<typeof draft> = {}) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    save.mutate({ default_channel_ids: next.default_channel_ids, prompts: next.prompts, guide: next.guide, enabled: next.enabled });
  };
  const setPrompts = (prompts: OnboardingPrompt[]) => setDraft((d) => ({ ...d, prompts }));
  const setGuide = (g: OnboardingGuide) => setDraft((d) => ({ ...d, guide: g }));

  if (step === null) return <Intro onStart={() => setStep(0)} />;

  const toggleDefaults = (ids: string[], on: boolean) =>
    setDraft((d) => ({ ...d, default_channel_ids: on ? [...new Set([...d.default_channel_ids, ...ids])] : d.default_channel_ids.filter((x) => !ids.includes(x)) }));

  const editingPrompt = editing ? draft.prompts[editing.prompt] : null;
  const promptSection = (preJoin: boolean) => {
    const list = draft.prompts.map((p, i) => ({ p, i })).filter(({ p }) => p.pre_join === preJoin);
    return (
      <div className="space-y-3">
        {list.map(({ p, i }, n) => (
          <QuestionCard
            key={p.id}
            index={n}
            prompt={p}
            showErrors={showErrors}
            onChange={(np) => setPrompts(draft.prompts.map((x, j) => (j === i ? np : x)))}
            onDelete={() => setPrompts(draft.prompts.filter((_, j) => j !== i))}
            onEditOption={(option) => setEditing({ prompt: i, option })}
          />
        ))}
        <button
          type="button"
          onClick={() => setPrompts([...draft.prompts, { id: uid(), title: "", required: false, multiple: true, pre_join: preJoin, options: [] }])}
          className="w-full h-[50px] rounded-lg border border-dashed border-white/[0.15] flex items-center justify-center gap-2 text-base font-medium text-[hsl(var(--text-link))] hover:bg-[hsl(var(--interactive-background-hover))]"
        >
          <CirclePlus className="w-5 h-5" /> Ajouter une question
        </button>
      </div>
    );
  };

  return (
    <div className="pb-32">
      {/* Barre d'etapes */}
      <div className="grid grid-cols-5 gap-2">
        {STEPS.map((label, i) => (
          <button key={label} type="button" onClick={() => (i < step || (i === step + 1 && canNext) ? setStep(i) : undefined)} className="text-left">
            <span className={cn("block h-1 rounded-full", i === step ? "bg-[#949cf7]" : i < step ? "bg-[#949cf7]/50" : "bg-[hsl(var(--button-secondary))]")} />
            <span className={cn("mt-2 block text-xs leading-4", i === step ? "text-[#949cf7]" : "text-muted-foreground")}>{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 animate-step-in" key={step}>
        {step === 0 && <SecuritySetupPanel serverId={serverId} />}

        {step === 1 && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-white">Salons par défaut</h2>
              <p className="mt-2 text-base text-foreground">Définis les salons par défaut que tous les membres verront dans leur liste des salons en rejoignant le serveur. Les membres pourront ajouter des salons grâce aux questions de personnalisation.</p>
              <p className="mt-2 flex items-center gap-2 text-base text-[hsl(var(--text-link))]">Passer au mode avancé <ComingSoonBadge /></p>
              <div className="mt-6 space-y-4">
                {categories.map((cat) => {
                  const ids = cat.channels.map((c) => c.id);
                  const all = ids.length > 0 && ids.every((id) => defaults.has(id));
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between px-2 h-9">
                        <span translate="no" className="text-sm font-medium text-muted-foreground">{cat.name}</span>
                        <Checkbox checked={all} onChange={(v) => toggleDefaults(ids, v)} label={`Tous les salons de ${cat.name}`} />
                      </div>
                      <div className="rounded-lg bg-[hsl(var(--card))] border border-white/[0.06] divide-y divide-white/[0.06]">
                        {cat.channels.map((c) => {
                          const Icon = channelTypeIcon[c.type ?? "text"] ?? channelTypeIcon.text;
                          return (
                            <label key={c.id} className="flex items-center gap-2 h-11 px-3 cursor-pointer hover:bg-[hsl(var(--interactive-background-hover))]">
                              <Icon className="w-5 h-5 text-muted-foreground" />
                              <span translate="no" className="flex-1 text-base text-white">{c.name}</span>
                              <Checkbox checked={defaults.has(c.id)} onChange={(v) => toggleDefaults([c.id], v)} label={c.name} />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <aside className="w-full lg:w-[230px] shrink-0 rounded-lg bg-[hsl(var(--card))] border border-white/[0.06] p-4">
              <p className="text-xs"><span className="font-semibold text-[#949cf7]">{chattable.length} salons où tu peux discuter</span> <span className="ml-1 font-semibold text-foreground">{defaults.size} au total</span></p>
              <div className="mt-2 h-1.5 rounded-full bg-[hsl(var(--button-secondary))] overflow-hidden">
                <div className="h-full bg-[hsl(var(--online))] transition-all" style={{ width: `${Math.min(100, (chattable.length / 1) * 50 + (defaults.size ? 50 : 0))}%` }} />
              </div>
              <p className="mt-3 flex items-start gap-2 text-xs text-foreground">
                {chattable.length > 0 ? <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" /> : <Circle className="w-4 h-4 shrink-0 text-muted-foreground" />}
                Doit inclure 1 salon dans lequel @everyone peut lire et envoyer des messages.
              </p>
              {defaults.size > 0 && (
                <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1">
                  {categories.map((cat) => {
                    const chosen = cat.channels.filter((c) => defaults.has(c.id));
                    if (!chosen.length) return null;
                    return (
                      <div key={cat.id}>
                        <p translate="no" className="text-xs font-semibold text-muted-foreground">{cat.name}</p>
                        {chosen.map((c) => {
                          const Icon = channelTypeIcon[c.type ?? "text"] ?? channelTypeIcon.text;
                          return <p key={c.id} className="flex items-center gap-1.5 h-7 text-sm text-foreground"><Icon className="w-4 h-4" />{c.name}</p>;
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </aside>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-white">Questions</h2>
            <p className="mt-2 text-base text-foreground">Crée des questions pour aider tes membres à choisir des salons et des rôles supplémentaires. Leur liste des salons sera personnalisée selon leurs réponses.</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-base">
              <button type="button" className="text-[hsl(var(--text-link))] hover:underline" onClick={() => setPrompts([...draft.prompts, {
                id: uid(), title: "Que veux-tu faire dans cette communauté ?", required: true, multiple: true, pre_join: true,
                options: allChannels.slice(0, 2).map((c) => ({ id: uid(), title: `Discuter dans #${c.name}`, description: "", emoji: "💬", channel_ids: [c.id], role_ids: [] })),
              }])}>Voir des exemples</button>
              <span className="text-muted-foreground">·</span>
              <button type="button" className="text-[hsl(var(--text-link))] hover:underline" onClick={() => setPreview(true)}>Aperçu</button>
              <span className="text-muted-foreground">·</span>
              <span className="flex items-center gap-2 text-[hsl(var(--text-link))]">Passer au mode avancé <ComingSoonBadge /></span>
            </p>
            <div className="mt-5 flex items-center gap-4 px-4 py-3 rounded-lg bg-[hsl(var(--card))] border border-white/[0.06]">
              <p className="flex-1 text-sm text-foreground">
                {uncovered.length === 0
                  ? "Aucun salon public ne manque au salon par défaut et au salon Questions."
                  : `${uncovered.length} salon${uncovered.length > 1 ? "s ne sont" : " n'est"} accessible${uncovered.length > 1 ? "s" : ""} ni par défaut ni par une question : ${uncovered.slice(0, 3).map((c) => c.name).join(", ")}${uncovered.length > 3 ? "…" : ""}`}
              </p>
              <div className="w-[110px] h-1.5 rounded-full bg-[hsl(var(--button-secondary))] overflow-hidden">
                <div className={cn("h-full transition-all", uncovered.length === 0 ? "bg-[hsl(var(--online))]" : "bg-[#f0b232]")} style={{ width: `${allChannels.length ? ((allChannels.length - uncovered.length) / allChannels.length) * 100 : 100}%` }} />
              </div>
            </div>
            <h3 className="mt-6 text-lg font-semibold text-white">Questions anticipées</h3>
            <p className="mt-1 mb-3 text-base text-foreground">Les membres répondront à ces questions avant de rejoindre ton serveur. Sers-t'en pour leur assigner des salons et des rôles clés. Les questions anticipées seront également disponibles sur la page Salons et rôles.</p>
            {promptSection(true)}
            <div className="h-px my-6 bg-[hsl(var(--border-subtle))]" />
            <h3 className="text-lg font-semibold text-white">Questions complémentaires</h3>
            <p className="mt-1 mb-3 text-base text-foreground">Les membres répondront à ces questions après avoir rejoint ton serveur, sur la page Salons et rôles. Sers-t'en pour assigner des rôles que les membres peuvent choisir plus tard, comme des rôles personnalisés, par exemple.</p>
            {promptSection(false)}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold text-white">Guide du serveur</h2>
            <p className="mt-2 text-base text-foreground">Le guide est la première page que voient tes nouveaux membres : accueille-les, propose-leur quelques tâches et partage tes ressources.</p>
            <p className="mt-6 mb-2 text-base font-semibold text-white">Message de bienvenue</p>
            <textarea value={guide.welcome ?? ""} maxLength={300} onChange={(e) => setGuide({ ...guide, welcome: e.target.value })} placeholder={`Bienvenue sur ${"le serveur"} ! Présente-toi et explore les salons.`} className={cn(fieldCls, "h-[96px] py-2 resize-none")} />
            <div className="mt-6 flex items-center">
              <p className="text-base font-semibold text-white">Tâches pour les nouveaux membres</p>
              <span className="ml-2 text-sm text-muted-foreground">{guide.tasks?.length ?? 0} sur 5</span>
            </div>
            <div className="mt-2 space-y-2">
              {(guide.tasks ?? []).map((t, i) => (
                <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-[hsl(var(--card))] border border-white/[0.06]">
                  <EmojiStickerPicker serverId={null} onEmojiSelect={(emoji) => setGuide({ ...guide, tasks: guide.tasks!.map((x, j) => (j === i ? { ...x, emoji } : x)) })} trigger={
                    <button type="button" aria-label="Émoji" className="w-10 h-10 shrink-0 rounded-lg bg-[hsl(var(--search-background))] flex items-center justify-center">{t.emoji ? <span className="text-xl">{t.emoji}</span> : <Smile className="w-5 h-5 text-[hsl(var(--icon-default))]" />}</button>
                  } />
                  <input value={t.title} maxLength={60} placeholder="Ex. : Présente-toi" onChange={(e) => setGuide({ ...guide, tasks: guide.tasks!.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} className={cn(fieldCls, "flex-1")} />
                  <select value={t.channel_id ?? ""} onChange={(e) => setGuide({ ...guide, tasks: guide.tasks!.map((x, j) => (j === i ? { ...x, channel_id: e.target.value || null } : x)) })} className={cn(fieldCls, "w-[180px]")} aria-label="Salon de la tâche">
                    <option value="">Aucun salon</option>
                    {allChannels.map((c) => <option translate="no" key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" aria-label="Supprimer la tâche" onClick={() => setGuide({ ...guide, tasks: guide.tasks!.filter((_, j) => j !== i) })} className="p-2 text-[hsl(var(--icon-default))] hover:text-[#f57976]"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {(guide.tasks?.length ?? 0) < 5 && (
                <button type="button" onClick={() => setGuide({ ...guide, tasks: [...(guide.tasks ?? []), { id: uid(), title: "", channel_id: null, emoji: null }] })} className="w-full h-11 rounded-lg border border-dashed border-white/[0.15] flex items-center justify-center gap-2 text-base font-medium text-[hsl(var(--text-link))] hover:bg-[hsl(var(--interactive-background-hover))]">
                  <CirclePlus className="w-5 h-5" /> Ajouter une tâche
                </button>
              )}
            </div>
            <div className="mt-6 flex items-center">
              <p className="text-base font-semibold text-white">Ressources</p>
              <span className="ml-2 text-sm text-muted-foreground">{guide.resources?.length ?? 0} sur 7</span>
            </div>
            <div className="mt-2 space-y-2">
              {(guide.resources ?? []).map((r, i) => (
                <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg bg-[hsl(var(--card))] border border-white/[0.06]">
                  <input value={r.title} maxLength={60} placeholder="Ex. : Règles du serveur" onChange={(e) => setGuide({ ...guide, resources: guide.resources!.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} className={cn(fieldCls, "flex-1")} />
                  <select value={r.channel_id ?? ""} onChange={(e) => setGuide({ ...guide, resources: guide.resources!.map((x, j) => (j === i ? { ...x, channel_id: e.target.value || null } : x)) })} className={cn(fieldCls, "w-[180px]")} aria-label="Salon de la ressource">
                    <option value="">Aucun salon</option>
                    {allChannels.map((c) => <option translate="no" key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" aria-label="Supprimer la ressource" onClick={() => setGuide({ ...guide, resources: guide.resources!.filter((_, j) => j !== i) })} className="p-2 text-[hsl(var(--icon-default))] hover:text-[#f57976]"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {(guide.resources?.length ?? 0) < 7 && (
                <button type="button" onClick={() => setGuide({ ...guide, resources: [...(guide.resources ?? []), { id: uid(), title: "", channel_id: null }] })} className="w-full h-11 rounded-lg border border-dashed border-white/[0.15] flex items-center justify-center gap-2 text-base font-medium text-[hsl(var(--text-link))] hover:bg-[hsl(var(--interactive-background-hover))]">
                  <CirclePlus className="w-5 h-5" /> Ajouter une ressource
                </button>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-xl font-semibold text-white">Évaluation</h2>
            <p className="mt-2 text-base text-foreground">Voici le récapitulatif de ton processus d'accueil.</p>
            <div className="mt-5 rounded-lg bg-[hsl(var(--card))] border border-white/[0.06] divide-y divide-white/[0.06]">
              {[
                { ok: (settings?.verification_level ?? "none") !== "none", label: "Tests de sécurité", hint: (settings?.verification_level ?? "none") !== "none" ? "Un niveau de vérification est défini." : "Aucun niveau de vérification (recommandé : Faible).", go: 0 },
                { ok: chattable.length > 0, label: "Salons par défaut", hint: `${defaults.size} salon(s) par défaut, dont ${chattable.length} où discuter.`, go: 1 },
                { ok: promptsValid, label: "Questionnaire de personnalisation", hint: `${draft.prompts.length} question(s)${promptsValid ? "" : " — certaines sont incomplètes"}.`, go: 2 },
                { ok: !!guide.welcome?.trim(), label: "Guide du serveur", hint: guide.welcome?.trim() ? `${guide.tasks?.length ?? 0} tâche(s), ${guide.resources?.length ?? 0} ressource(s).` : "Aucun message de bienvenue (facultatif).", go: 3 },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-3 px-4 py-3">
                  {r.ok ? <CheckCircle2 className="w-5 h-5 text-[hsl(var(--online))]" /> : <AlertCircle className="w-5 h-5 text-[#f0b232]" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-white">{r.label}</p>
                    <p className="text-sm text-muted-foreground">{r.hint}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setStep(r.go)}>Modifier</Button>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-4 p-4 rounded-lg bg-[hsl(var(--card))] border border-white/[0.06]">
              <div className="flex-1">
                <p className="text-base font-semibold text-white">Activer le processus d'accueil</p>
                <p className="text-sm text-foreground">Les nouveaux membres répondront aux questions et verront les salons par défaut en rejoignant le serveur.</p>
              </div>
              <Switch
                checked={draft.enabled}
                disabled={!draft.enabled && (chattable.length === 0 || !promptsValid)}
                onCheckedChange={(v) => persist({ enabled: v })}
                aria-label="Activer le processus d'accueil"
              />
            </div>
            <button type="button" onClick={() => setPreview(true)} className="mt-3 text-sm text-[hsl(var(--text-link))] hover:underline">Aperçu de l'accueil des membres</button>
          </div>
        )}
      </div>

      {/* Barre du bas */}
      <div className="sticky bottom-4 mt-10 z-20 flex items-center gap-3 px-3 py-3 rounded-lg bg-[hsl(var(--card))] border border-white/[0.06] shadow-xl">
        <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setStep(step === 0 ? null : step - 1)}><ArrowLeft className="w-4 h-4" /> Retour</Button>
        <div className="ml-auto flex items-center gap-3">
          {step === 2 && !promptsValid && <span className="text-sm text-[#f0b232]">Tu as des questions incomplètes</span>}
          {step === 1 && chattable.length === 0 && <span className="text-sm text-[#f0b232]">Choisis au moins un salon où discuter</span>}
          {step < 4 ? (
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!canNext}
              onMouseEnter={() => step === 2 && setShowErrors(true)}
              onClick={() => {
                persist();
                setStep(step + 1);
              }}
            >
              Suivant <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => persist()}>{save.isPending ? "Enregistrement…" : "Enregistrer"}</Button>
          )}
        </div>
      </div>

      {!tipSeen.has(step) && <StepTip step={step} onDone={() => setTipSeen((s) => new Set(s).add(step))} />}

      {editing && editingPrompt && (
        <AnswerDialog
          questionLabel={`Question ${draft.prompts.filter((p) => p.pre_join === editingPrompt.pre_join).indexOf(editingPrompt) + 1}`}
          title={editingPrompt.title}
          initial={editing.option !== null ? editingPrompt.options[editing.option] : null}
          categories={categories}
          roles={assignableRoles}
          onClose={() => setEditing(null)}
          onDelete={editing.option !== null ? () => {
            setPrompts(draft.prompts.map((p, i) => (i === editing.prompt ? { ...p, options: p.options.filter((_, j) => j !== editing.option) } : p)));
            setEditing(null);
          } : undefined}
          onSave={(o) => {
            setPrompts(draft.prompts.map((p, i) => i !== editing.prompt ? p : {
              ...p,
              options: editing.option === null ? [...p.options, o] : p.options.map((x, j) => (j === editing.option ? o : x)),
            }));
            setEditing(null);
          }}
        />
      )}

      {preview && <MemberOnboardingDialog serverId={serverId} onboarding={draft} preview onClose={() => setPreview(false)} />}
    </div>
  );
}
