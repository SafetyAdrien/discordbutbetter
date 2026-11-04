import { useEffect, useMemo, useState } from "react";
import { Globe } from "lucide-react";
import { Lock, Mail } from "@/components/icons/discord/lucide";
import { Plus, X } from "@/components/icons/serverSettingsIcons";
import { cn } from "@/lib/utils";
import { useServers } from "@/hooks/useServers";
import { useUpdateServerInfo } from "@/hooks/useServerAssets";
import { useServerSettings, useUpdateServerSettings } from "@/hooks/useServerSettings";
import { ComingSoonBadge, SettingsPage, SettingsSection, SettingsToggleRow, UnsavedChangesBar } from "./SettingsUI";
import { settingsInputCls, settingsLinkCls } from "./settingsStyles";
import { USelect } from "@/components/user-settings/UserSettingsUI";
import { useServerDiscoveryCategory } from "@/hooks/useDiscovery";
import { SERVER_CATEGORY_OPTIONS } from "@/components/discovery/discoveryConfig";
import { useQueryClient } from "@tanstack/react-query";

/*
 * Page "Acces" (video de reference) : trois cartes de mode d'acces, limite
 * d'age, regles du serveur. "Mode Decouverte" correspond au serveur public
 * de l'app (`servers.is_public`, liste de la fenetre Decouvrir).
 */

const RULE_EXAMPLES = [
  "Reste courtois et respectueux",
  "Spam ou autopromotion interdits",
  "Pas de contenu obscène ou soumis à une limite d'âge",
  "Aidez à créer un environnement sain",
];

type AccessMode = "invite_only" | "discoverable";

// Reference stable : un `[]` cree a chaque rendu relancait l'effet de
// reinitialisation en boucle tant que les reglages n'etaient pas charges.
const NO_RULES: string[] = [];

export function AccessSettings({ serverId }: { serverId: string }) {
  const { data: servers = [] } = useServers();
  const server = servers.find((s) => s.id === serverId);
  const { data: settings } = useServerSettings(serverId);
  const updateServer = useUpdateServerInfo();
  const updateSettings = useUpdateServerSettings();
  const queryClient = useQueryClient();
  const { data: savedCategory = null } = useServerDiscoveryCategory(serverId);

  const initial = useMemo(
    () => ({
      mode: (server?.is_public ? "discoverable" : "invite_only") as AccessMode,
      ageRestricted: settings?.age_restricted ?? false,
      rulesEnabled: settings?.rules_enabled ?? false,
      rules: settings?.rules ?? NO_RULES,
      category: savedCategory ?? "",
    }),
    [server?.is_public, settings?.age_restricted, settings?.rules_enabled, settings?.rules, savedCategory],
  );

  const [mode, setMode] = useState<AccessMode>(initial.mode);
  const [ageRestricted, setAgeRestricted] = useState(initial.ageRestricted);
  const [rulesEnabled, setRulesEnabled] = useState(initial.rulesEnabled);
  const [rules, setRules] = useState<string[]>(initial.rules);
  const [category, setCategory] = useState<string>(initial.category);
  const [draft, setDraft] = useState("");

  const reset = () => {
    setMode(initial.mode);
    setAgeRestricted(initial.ageRestricted);
    setRulesEnabled(initial.rulesEnabled);
    setRules(initial.rules);
    setCategory(initial.category);
    setDraft("");
  };
  useEffect(reset, [initial]);

  const dirty =
    mode !== initial.mode ||
    ageRestricted !== initial.ageRestricted ||
    rulesEnabled !== initial.rulesEnabled ||
    category !== initial.category ||
    JSON.stringify(rules) !== JSON.stringify(initial.rules);

  const addRule = (text: string) => {
    const t = text.trim();
    if (!t || rules.includes(t) || rules.length >= 20) return;
    setRules((r) => [...r, t]);
    setDraft("");
  };

  const save = () => {
    if (mode !== initial.mode || category !== initial.category) {
      updateServer.mutate(
        { serverId, is_public: mode === "discoverable", discovery_category: category || null },
        { onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["server-discovery-category", serverId] }); void queryClient.invalidateQueries({ queryKey: ["discovery-servers"] }); } },
      );
    }
    updateSettings.mutate({
      serverId,
      settings: { age_restricted: ageRestricted, rules_enabled: rulesEnabled, rules },
    });
  };

  const modes: { id: AccessMode | "apply"; icon: React.ElementType; title: string; desc: string; disabled?: boolean }[] = [
    { id: "invite_only", icon: Lock, title: "Sur invitation uniquement", desc: "Les gens peuvent rejoindre ton serveur directement avec une invitation" },
    { id: "apply", icon: Mail, title: "Postule pour rejoindre", desc: "Les gens doivent soumettre une candidature qui doit ensuite être approuvée pour rejoindre", disabled: true },
    { id: "discoverable", icon: Globe, title: "Mode Découverte", desc: "Tout le monde peut rejoindre ton serveur directement via la Découverte de serveurs" },
  ];

  return (
    <SettingsPage title="Accès" description="Choisis comment les gens rejoignent ton serveur et ce qu'ils doivent accepter avant de participer.">
      <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-[hsl(var(--card))]">
        {modes.map(({ id, icon: Icon, title, desc, disabled }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setMode(id as AccessMode)}
              className={cn(
                "flex flex-col items-center text-center gap-1.5 px-3 py-4 rounded-lg transition-colors",
                active ? "bg-[hsl(var(--button-secondary))] text-white" : "text-muted-foreground hover:bg-[hsl(var(--interactive-background-hover))]",
                disabled && "opacity-60 cursor-not-allowed hover:bg-transparent",
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-semibold leading-4">{title}</span>
              <span className="text-xs leading-4">{desc}</span>
              {disabled && <ComingSoonBadge />}
            </button>
          );
        })}
      </div>

      {mode === "discoverable" && (
        <div className="mt-4 rounded-lg bg-[hsl(var(--card))] p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Catégorie dans la Découverte</p>
            <p className="text-xs leading-4 text-muted-foreground">Choisis l'onglet de la page Découvrir où ton serveur apparaît. Sans catégorie, il n'apparaît que dans « Accueil ».</p>
          </div>
          <USelect
            className="w-[240px]"
            value={category}
            options={[{ value: "", label: "Aucune catégorie" }, ...SERVER_CATEGORY_OPTIONS]}
            onChange={setCategory}
          />
        </div>
      )}

      <div className="mt-6">
        <SettingsToggleRow
          title="Serveur soumis à une limite d'âge"
          description={
            <>
              Les utilisateurs devront confirmer qu'ils ont l'âge légal pour voir le contenu de ce serveur.{" "}
              <a href="/trust" target="_blank" rel="noopener" className={settingsLinkCls}>En savoir plus.</a>
            </>
          }
          checked={ageRestricted}
          onCheckedChange={setAgeRestricted}
        />
        <SettingsToggleRow
          title="Règles du serveur"
          description="Les membres doivent accepter les règles avant de pouvoir discuter ou interagir dans le serveur."
          checked={rulesEnabled}
          onCheckedChange={setRulesEnabled}
        />
      </div>

      {rulesEnabled && (
        <SettingsSection title="Règles" className="mt-2">
          <ol className="space-y-2">
            {rules.map((rule, i) => (
              <li key={rule} className="flex items-center gap-3 px-3 h-11 rounded-lg bg-[hsl(var(--card))]">
                <span className="w-5 text-sm font-semibold text-muted-foreground">{i + 1}.</span>
                <span className="flex-1 min-w-0 truncate text-base text-foreground">{rule}</span>
                <button type="button" aria-label="Retirer la règle" onClick={() => setRules((r) => r.filter((x) => x !== rule))} className="text-[hsl(var(--header-icon))] hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ol>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addRule(draft);
            }}
          >
            <input value={draft} maxLength={300} onChange={(e) => setDraft(e.target.value)} placeholder="Entre une règle" className={settingsInputCls} />
          </form>
          <button
            type="button"
            onClick={() => addRule(draft)}
            disabled={!draft.trim()}
            className="mt-2 w-full h-10 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-sm font-medium text-foreground hover:bg-[hsl(var(--interactive-background-hover))] disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Ajouter une règle
          </button>

          <p className="mt-5 mb-2 text-xs font-semibold text-muted-foreground">Exemples de règles</p>
          <div className="flex flex-wrap gap-2">
            {RULE_EXAMPLES.filter((r) => !rules.includes(r)).map((r) => (
              <button key={r} type="button" onClick={() => addRule(r)} className="h-7 px-2.5 rounded-md bg-[hsl(var(--card))] text-xs text-muted-foreground hover:text-white hover:bg-[hsl(var(--interactive-background-hover))]">
                {r}
              </button>
            ))}
          </div>
        </SettingsSection>
      )}

      <UnsavedChangesBar visible={dirty} onReset={reset} onSave={save} saving={updateSettings.isPending || updateServer.isPending} />
    </SettingsPage>
  );
}
