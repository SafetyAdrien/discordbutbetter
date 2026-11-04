import { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { CheckCircle2, Info, Sprout, X } from "@/components/icons/serverSettingsIcons";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useChannels, useCreateChannel } from "@/hooks/useChannels";
import { useServerRoles, useUpdateRole } from "@/hooks/useRoles";
import { useSetPermissionOverride } from "@/hooks/useChannelPermissions";
import { useServers } from "@/hooks/useServers";
import { useUpdateServerInfo } from "@/hooks/useServerAssets";
import { useServerSettings, useUpdateServerSettings } from "@/hooks/useServerSettings";
import type { Database } from "@/integrations/supabase/types";
import { ComingSoonBadge, SettingsDivider, SettingsEmptyState, SettingsPage, SettingsSection, UnsavedChangesBar } from "./SettingsUI";
import { RISKY_PERMISSIONS } from "@/lib/riskyPermissions";
import { settingsInputCls, settingsLinkCls, settingsTextareaCls } from "./settingsStyles";
import { ChannelSheetIcon } from "@/components/icons/ChannelSheetIcon";
import { USelect } from "@/components/user-settings/UserSettingsUI";

type ServerPermission = Database["public"]["Enums"]["server_permission"];

/*
 * "Activer la communaute" puis "Parametres de communaute" (video de
 * reference). L'activation suit les trois etapes de Discord :
 *   1. salons des regles et des mises a jour (existants ou crees),
 *   2. retrait des permissions risquees de @everyone,
 *   3. acceptation des regles.
 * Les types Annonce et Conference restent disponibles sans communaute
 * dans l'app : l'activation n'en conditionne aucun.
 */

const CREATE = "__create__";


const LOCALES = [
  { id: "fr", label: "Français" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "de", label: "Deutsch" },
  { id: "it", label: "Italiano" },
  { id: "pt", label: "Português" },
];

function useTextChannels(serverId: string) {
  const { data } = useChannels(serverId);
  return useMemo(
    () => (data ? [...data.orphanChannels, ...data.categories.flatMap((c) => c.channels)].filter((c) => c.type === "text") : []),
    [data],
  );
}

function ChannelSelect({
  value,
  onChange,
  channels,
  allowCreate,
  placeholder = "Sélection...",
  rules = false,
}: {
  value: string;
  onChange: (v: string) => void;
  channels: { id: string; name: string }[];
  allowCreate?: boolean;
  placeholder?: string;
  /** Champ "Salon des regles" : icone du salon des regles, comme Discord. */
  rules?: boolean;
}) {
  // Liste deroulante a la Discord : icone du salon (20px) + nom, au lieu
  // d'un <select> natif qui affichait "#nom".
  const icon = <ChannelSheetIcon name={rules ? "rules" : "text"} size={20} className="text-[hsl(var(--icon-default))]" />;
  return (
    <USelect
      value={value}
      onChange={onChange}
      className="w-full"
      options={[
        allowCreate ? { value: CREATE, label: "En créer un pour moi" } : { value: "", label: placeholder },
        ...channels.map((c) => ({
          value: c.id,
          label: (
            <span className="flex items-center gap-1.5 min-w-0">
              {icon}
              <span translate="no" className="truncate">{c.name}</span>
            </span>
          ),
        })),
      ]}
    />
  );
}

type CommunityTab = "access" | "onboarding" | "analytics";

export function CommunitySettings({ serverId, onNavigate }: { serverId: string; onNavigate?: (tab: CommunityTab) => void }) {
  const { data: settings } = useServerSettings(serverId);
  return settings?.community_enabled ? (
    <CommunityOverview serverId={serverId} onNavigate={onNavigate} />
  ) : (
    <CommunityIntro serverId={serverId} />
  );
}

/** Pages "Processus d'accueil" et "Analyses de serveur" : pas encore de backend. */
export function CommunityComingSoon({ kind }: { kind: "onboarding" | "analytics" }) {
  const onboarding = kind === "onboarding";
  return (
    <SettingsPage title={onboarding ? "Processus d'accueil" : "Analyses de serveur"}>
      <SettingsEmptyState
        icon={onboarding ? <Sprout className="w-10 h-10" /> : <BarChart3 className="w-10 h-10" />}
        title={onboarding ? "Accueille tes nouveaux membres" : "Comprends l'activité de ton serveur"}
        description={
          <span className="inline-flex flex-col items-center gap-2">
            {onboarding
              ? "Questions d'accueil, salons par défaut et guide du serveur pour orienter les nouveaux arrivants."
              : "Croissance, rétention et engagement des membres de ta communauté."}
            <ComingSoonBadge />
          </span>
        }
      />
    </SettingsPage>
  );
}

function CommunityIntro({ serverId }: { serverId: string }) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const features = [
    { icon: Sprout, color: "text-[#3ba55c]", title: "Fais grandir ta communauté", text: "Rends ton serveur public pour que de nouvelles personnes le trouvent dans la Découverte de serveurs." },
    { icon: BarChart3, color: "text-[#5865f2]", title: "Maintiens tes membres actifs", text: "Accède à des outils comme l'écran des règles et AutoMod pour modérer ton serveur et le garder vivant." },
    { icon: Info, color: "text-[#ed4245]", title: "Reste informé", text: "Reçois dans un salon dédié les nouveautés et conseils pour les communautés." },
  ];
  return (
    <div className="pb-24">
      <div className="relative h-[180px] rounded-lg overflow-hidden bg-[hsl(var(--card))] flex items-center justify-center">
        {["Pokémon GO Paris", "Python", "Sneaker Fans", "Learn Latin", "Hogwarts School"].map((n, i) => (
          <span
            key={n}
            className="absolute h-7 px-2.5 rounded-md bg-[hsl(var(--button-secondary))] text-xs font-semibold text-foreground flex items-center"
            style={{ left: `${[8, 70, 12, 2, 66][i]}%`, top: `${[14, 14, 66, 42, 64][i]}%` }}
          >
            {n}
          </span>
        ))}
        <span className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#5865f2] to-[#3ba55c] shadow-xl flex items-center justify-center text-4xl">🏡</span>
      </div>
      <div className="mt-6 text-center">
        <h2 className="text-2xl font-semibold text-white">Tu crées une communauté ?</h2>
        <p className="mt-2 text-base text-foreground">
          Convertis ton serveur en serveur de communauté pour accéder à des outils administratifs supplémentaires qui
          t'aident à modérer et à développer ton serveur.{" "}
          <a href="/trust" target="_blank" rel="noopener" className={settingsLinkCls}>En savoir plus.</a>
        </p>
        <Button className="mt-5" onClick={() => setWizardOpen(true)}>Activer la communauté</Button>
      </div>
      <SettingsDivider />
      <p className="text-center text-sm text-muted-foreground">
        Les serveurs de communauté sont des espaces plus vastes où les gens ayant des centres d'intérêts communs peuvent se
        retrouver. Activer la communauté ne rend pas ton serveur visible dans la Découverte : c'est la page Accès qui le
        décide.
      </p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {features.map(({ icon: Icon, color, title, text }) => (
          <div key={title} className="p-4 rounded-lg bg-[hsl(var(--card))]">
            <Icon className={`w-6 h-6 ${color}`} />
            <p className="mt-3 text-base font-semibold text-white">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
      <CommunityWizard serverId={serverId} open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}

function CommunityWizard({ serverId, open, onClose }: { serverId: string; open: boolean; onClose: () => void }) {
  // -1 : intro "Activer la communaute", puis 4 etapes (barre de progression).
  const [step, setStep] = useState(-1);
  const { data: settings } = useServerSettings(serverId);
  const [rulesChannel, setRulesChannel] = useState(CREATE);
  const [updatesChannel, setUpdatesChannel] = useState(CREATE);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const channels = useTextChannels(serverId);
  const { data: roles = [] } = useServerRoles(serverId);
  const createChannel = useCreateChannel();
  const setOverride = useSetPermissionOverride();
  const updateRole = useUpdateRole();
  const updateSettings = useUpdateServerSettings();

  const everyone = roles.find((r) => r.is_default);
  const everyonePerms = (everyone?.permissions ?? []) as ServerPermission[];
  const riskyActive = RISKY_PERMISSIONS.filter((p) => everyonePerms.includes(p.id));

  const close = () => {
    setStep(-1);
    setAccepted(false);
    onClose();
  };

  const finish = async () => {
    setBusy(true);
    try {
      let rulesId = rulesChannel;
      let updatesId = updatesChannel;
      if (rulesId === CREATE) {
        const c = await createChannel.mutateAsync({ serverId, categoryId: null, name: "règles", type: "text" });
        rulesId = c.id;
      }
      if (updatesId === CREATE) {
        const c = await createChannel.mutateAsync({ serverId, categoryId: null, name: "moderator-only", type: "text" });
        updatesId = c.id;
        // Salon reserve a l'equipe : invisible pour @everyone.
        if (everyone) setOverride.mutate({ channelId: c.id, roleId: everyone.id, permission: "view_channel", type: "deny" });
      }
      if (everyone && riskyActive.length > 0) {
        const risky = new Set(RISKY_PERMISSIONS.map((p) => p.id));
        await updateRole.mutateAsync({ roleId: everyone.id, serverId, permissions: everyonePerms.filter((p) => !risky.has(p)) });
      }
      await updateSettings.mutateAsync({
        serverId,
        settings: {
          community_enabled: true,
          rules_channel_id: rulesId,
          updates_channel_id: updatesId,
          // Etape "Assure la securite" : e-mail verifie requis (niveau Faible).
          ...((settings?.verification_level ?? "none") === "none" ? { verification_level: "low" } : {}),
        },
      });
      close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className={step === -1 ? "sm:max-w-[480px] p-0 gap-0 overflow-hidden" : "sm:max-w-[480px] p-6 gap-0"}>
        {step === -1 ? (
          <>
            {/* Illustration (feu de camp) sur degrade vert, comme Discord */}
            <div className="h-[200px] bg-gradient-to-b from-[#1f6f43] via-[#1d4f3a] to-transparent flex items-end justify-center pb-2">
              <span className="text-[96px] leading-none drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]" aria-hidden="true">🔥</span>
            </div>
            <div className="px-6 pb-6 text-center">
              <DialogTitle className="text-2xl font-bold text-white">Activer la communauté</DialogTitle>
              <DialogDescription className="mt-2 text-base leading-5 text-muted-foreground">
                Les serveurs de communauté sont des espaces plus vastes construits autour d'intérêts partagés. Activer la
                Communauté nécessite de mettre en place des paramètres de sécurité, des salons de règles et de nouvelles,
                ainsi que des paramètres de modération.
              </DialogDescription>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={close}>Annuler</Button>
                <Button onClick={() => setStep(0)}>Commencer</Button>
              </div>
            </div>
          </>
        ) : (
        <>
        <div className="h-2 w-36 rounded-full bg-[hsl(var(--button-secondary))] overflow-hidden mb-5">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${((step + 1) / 4) * 100}%` }} />
        </div>

        {step === 0 && (
          <>
            <DialogTitle className="text-xl font-semibold text-white">Assure la sécurité de ta communauté</DialogTitle>
            <DialogDescription className="mt-1 text-base leading-5 text-muted-foreground">
              Pour garantir la sécurité des utilisateurs, les serveurs de communauté doivent activer les paramètres de
              modération suivants.
            </DialogDescription>
            <div className="mt-6 flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-[hsl(var(--online))]" />
              <div>
                <p className="text-base font-medium text-white">Une adresse e-mail vérifiée est requise</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Pour réduire le spam, les membres du serveur doivent faire vérifier leur adresse e-mail avant
                  d'envoyer des messages. Cela ne s'applique pas aux membres ayant des rôles.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-[hsl(var(--offline))]" />
              <div>
                <p className="flex items-center gap-2 text-base font-medium text-white">
                  Filtre de contenus médias explicites <ComingSoonBadge />
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Les médias contenant du contenu explicite envoyés sur ce serveur seront analysés et supprimés
                  automatiquement (sauf salons soumis à une limite d'âge).
                </p>
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <DialogTitle className="text-xl font-semibold text-white">Configurer les bases</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Dis-nous sur quel salon se trouvent les règles de ton serveur et sur quel salon envoyer les annonces !
            </DialogDescription>
            <p className="mt-5 text-sm font-semibold text-white">Salon des règles ou de la Charte d'utilisation</p>
            <p className="mt-0.5 mb-2 text-xs text-muted-foreground">
              Les serveurs de communauté doivent disposer de règles clairement affichées pour les membres.
            </p>
            <ChannelSelect value={rulesChannel} onChange={setRulesChannel} channels={channels} allowCreate rules />
            <p className="mt-5 text-sm font-semibold text-white">Salon de mises à jour de la communauté</p>
            <p className="mt-0.5 mb-2 text-xs text-muted-foreground">
              Les conseils et nouveautés pour les administrateurs y seront publiés. Nous te recommandons un salon à
              l'accès restreint.
            </p>
            <ChannelSelect value={updatesChannel} onChange={setUpdatesChannel} channels={channels} allowCreate />
          </>
        )}

        {step === 2 && (
          <>
            <DialogTitle className="text-xl font-semibold text-white">Mettre à jour les paramètres par défaut</DialogTitle>
            <DialogDescription className="sr-only">Permissions risquées retirées à @everyone</DialogDescription>
            <div className="mt-4 flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-[#3ba55c]" />
              <div>
                <p className="text-sm font-semibold text-white">Désactiver les permissions risquées pour @everyone</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Ces permissions seront retirées au rôle @everyone. Tu pourras les rendre à des rôles précis ensuite.
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-[hsl(var(--card))]">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                {riskyActive.length > 0 ? "Désactivation des permissions risquées..." : "Aucune permission risquée n'est active."}
              </p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                {riskyActive.map((p) => (
                  <li key={p.id} className="flex items-center gap-1.5 text-xs text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f0b232]" />
                    {p.label}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <DialogTitle className="text-xl font-semibold text-white">Dernière étape</DialogTitle>
            <DialogDescription className="sr-only">Accepter les règles des serveurs de communauté</DialogDescription>
            <p className="mt-4 text-sm font-semibold text-white">Suis les règles</p>
            <p className="mt-1 text-sm text-muted-foreground">
              En définissant ton serveur comme un serveur de communauté, tu déclares que ton serveur respecte les{" "}
              <a href="/trust" target="_blank" rel="noopener" className={settingsLinkCls}>conditions d'utilisation</a>.
            </p>
            <label className="mt-4 flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} />
              Je comprends et j'accepte
            </label>
          </>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button type="button" onClick={() => setStep((s) => s - 1)} className="text-sm font-medium text-white hover:underline">
            Retour
          </button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)}>{step === 0 || step === 2 ? "Activer" : "Suivant"}</Button>
          ) : (
            <Button disabled={!accepted || busy} onClick={finish}>Terminer la configuration</Button>
          )}
        </div>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CommunityOverview({ serverId, onNavigate }: { serverId: string; onNavigate?: (tab: CommunityTab) => void }) {
  const { data: settings } = useServerSettings(serverId);
  const { data: servers = [] } = useServers();
  const server = servers.find((s) => s.id === serverId);
  const updateSettings = useUpdateServerSettings();
  const updateServer = useUpdateServerInfo();
  const channels = useTextChannels(serverId);
  const [bannerHidden, setBannerHidden] = useState(false);

  const initial = useMemo(
    () => ({
      rules: settings?.rules_channel_id ?? "",
      updates: settings?.updates_channel_id ?? "",
      safety: settings?.safety_alerts_channel_id ?? "",
      locale: settings?.preferred_locale ?? "fr",
      description: server?.description ?? "",
    }),
    [settings?.rules_channel_id, settings?.updates_channel_id, settings?.safety_alerts_channel_id, settings?.preferred_locale, server?.description],
  );
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    updateSettings.mutate({
      serverId,
      settings: {
        rules_channel_id: form.rules || null,
        updates_channel_id: form.updates || null,
        safety_alerts_channel_id: form.safety || null,
        preferred_locale: form.locale,
      },
    });
    if (form.description !== initial.description) updateServer.mutate({ serverId, description: form.description });
  };

  const row = (title: string, help: string, control: React.ReactNode) => (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4 py-5 border-b border-border">
      <div>
        <p className="text-base font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-[18px] text-muted-foreground">{help}</p>
      </div>
      <div>{control}</div>
    </div>
  );

  return (
    <SettingsPage title="Paramètres de communauté">
      {!bannerHidden && (
        <div className="relative p-4 pr-10 rounded-lg bg-[hsl(var(--card))] border border-white/[0.06]">
          <button type="button" aria-label="Masquer" onClick={() => setBannerHidden(true)} className="absolute top-3 right-3 text-[hsl(var(--header-icon))] hover:text-white">
            <X className="w-4 h-4" />
          </button>
          <p className="text-base font-semibold text-white">Ton serveur est maintenant un serveur de communauté !</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu as désormais accès à des outils supplémentaires qui peuvent t'aider à modérer, gérer et faire grandir ton
            serveur. Jette un œil sur certains d'entre eux pour commencer !
          </p>
          {onNavigate && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onNavigate("onboarding")}>Configurer le processus d'accueil</Button>
              <Button size="sm" variant="secondary" onClick={() => onNavigate("access")}>Demander Découverte</Button>
              <Button size="sm" variant="secondary" onClick={() => onNavigate("analytics")}>Consulter les analyses de serveur</Button>
            </div>
          )}
        </div>
      )}

      {row(
        "Salon des règles ou de la Charte d'utilisation",
        "Sélectionne le salon abritant tes règles. Ce salon s'affichera par défaut tout en haut.",
        <ChannelSelect value={form.rules} onChange={set("rules")} channels={channels} rules />,
      )}
      {row(
        "Salon de mises à jour de la communauté",
        "C'est le salon où sont envoyées les mises à jour pertinentes aux administrateurs et modérateurs. Choisis de préférence un salon à l'accès restreint.",
        <ChannelSelect value={form.updates} onChange={set("updates")} channels={channels} />,
      )}
      {row(
        "Salon de notifications de sécurité",
        "C'est le salon où seront envoyées les alertes de sécurité. Choisis de préférence un salon à l'accès restreint.",
        <ChannelSelect value={form.safety} onChange={set("safety")} channels={channels} />,
      )}
      {row(
        "Langue principale du serveur",
        "La langue principale parlée sur ton serveur.",
        <select value={form.locale} onChange={(e) => set("locale")(e.target.value)} className={settingsInputCls}>
          {LOCALES.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>,
      )}

      <SettingsSection className="mt-6" title="Description du serveur" description="Comment décrirais-tu ton serveur à quelqu'un qui ne le connaît pas ?">
        <textarea value={form.description} maxLength={120} onChange={(e) => set("description")(e.target.value)} className={settingsTextareaCls} />
      </SettingsSection>

      <SettingsDivider />
      <SettingsSection
        title="Désactiver la communauté"
        description="Ton serveur redeviendra un serveur classique. Les salons et réglages créés restent en place."
        action={
          <Button variant="destructive" onClick={() => updateSettings.mutate({ serverId, settings: { community_enabled: false } })}>
            Désactiver la communauté
          </Button>
        }
      />

      <UnsavedChangesBar visible={dirty} onReset={() => setForm(initial)} onSave={save} saving={updateSettings.isPending} />
    </SettingsPage>
  );
}
